import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { TypedError } from "../errors/errors.types";
import { handleErrorResponse } from "../utils/response.utils";

import * as PlaylistService from "./playlists/playlists.service";
import * as MusicService from "./music.service";

import { getCurrentUser } from "../auth/auth.utils";

import {
  PreferenceType,
  isValidPreferenceType,
} from "./playlists/playlists.types";

const prisma = new PrismaClient();

/**
 * Router Definition
 */

export const musicRouter = express.Router();

/**
 * Controller Definitions
 */

// --- Get Playlist ---
musicRouter.get("/playlists/", async (req: Request, res: Response) => {
  try {
    // validate inputs
    const userId1 = parseInt(req.query.userId1 as string);
    const userId2 = parseInt(req.query.userId2 as string);
    const preferenceType = req.query.preferenceType as string;

    if (isNaN(userId1) || isNaN(userId2)) {
      throw new TypedError("User IDs must be numbers", 400);
    }

    if (userId1 === userId2) {
      throw new TypedError("User IDs must be different", 400);
    }

    if (!isValidPreferenceType(preferenceType)) {
      throw new TypedError("Invalid preference type", 400);
    }

    const [user1, user2] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId1,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: userId2,
        },
      }),
    ]);

    if (!user1) {
      throw new TypedError("User1 not found", 404);
    }
    if (!user2) {
      throw new TypedError("User2 not found", 404);
    }

    const playlist = await PlaylistService.getPlaylist(
      user1,
      user2,
      preferenceType as PreferenceType
    );

    res.status(200).send(playlist);
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});

// --- Get Tracks by Name and Artist Name ---
musicRouter.get("/tracks/", async (req: Request, res: Response) => {
  try {
    const trackName = req.query.name as string;
    const artistName = req.query.artist as string;

    if (!trackName || !artistName) {
      throw new TypedError("Track name and artist name are required", 400);
    }

    const track = await MusicService.getTrackByNameAndArtistName(
      trackName,
      artistName
    );

    if (!track) {
      throw new TypedError("No tracks found.", 404);
    }

    res.status(200).send({
      tracks: [track],
    });
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});

// --- Identify Track from LastfmListen ---
musicRouter.get(
  "/lastfm-listens/:id/track",
  async (req: Request, res: Response) => {
    try {
      const lastfmListenIdParam = req.params.id;

      if (!lastfmListenIdParam) {
        throw new TypedError("Listen ID is required", 400);
      }

      const lastfmListenId = parseInt(lastfmListenIdParam);

      if (isNaN(lastfmListenId)) {
        throw new TypedError("Listen ID must be a number", 400);
      }

      const listen = await prisma.listen.findUnique({
        where: {
          lastfmListenId: lastfmListenId,
        },
      });

      if (listen) {
        const track = await prisma.track.findUnique({
          where: {
            id: listen.trackId,
          },
          include: {
            artists: true,
          },
        });

        if (!track) {
          throw new TypedError("Track not found", 404);
        }

        const convertedTrack = MusicUtils.convertPrismaTrackAndArtistsToTrack(
          track,
          track.artists
        );

        res.status(200).send(convertedTrack);
      } else {
        // TODO: Implement attempt to find it from existing tracks

        // No listen found. Try to get it from Spotify.
        const lastfmListens = (await prisma.$queryRaw`
          SELECT 
            trackData->>'$.name' as trackName, 
            trackData->>'$.artist.name' as artistName,
            trackData->>'$.mbid' as mbid
          FROM LastfmListen
          WHERE id = ${lastfmListenId}
          LIMIT 1`) as
          | {
              mbid: string;
              trackName: string;
              artistName: string;
            }[]
          | null;

        if (!lastfmListens || lastfmListens.length === 0) {
          throw new TypedError("Listen not found", 404);
        }

        // get current user so we can use their access token
        const user = getCurrentUser(req);

        if (!user) {
          throw new TypedError(
            "No user found. Login with Spotify to continue.",
            400
          );
        }

        const accessToken = await SpotifyService.getAccessToken(user);

        if (!accessToken) {
          throw new TypedError(
            "No access token found for user. Login with spotify to continue.",
            400
          );
        }

        // get all listens with this track name and artist name
        const unlinkedLastfmListensWithSameTrack = (await prisma.$queryRaw`
          SELECT
            LastfmListen.id as lastfmListenId,
            concat(trackData->>'$.name', '|', trackData->>'$.artist.name') as track,
            LastfmListen.listenedAt as listenedAt,
            LastfmListen.analyzedAt as analyzedAt
          FROM LastfmListen
            LEFT JOIN Listen ON Listen.lastfmListenId = LastfmListen.id
          WHERE 
            concat(trackData->>'$.name', '|' ,trackData->>'$.artist.name') = ${
              lastfmListens[0].trackName + "|" + lastfmListens[0].artistName
            }
            AND 
            Listen.id IS NULL
        `) as {
          lastfmListenId: number;
          track: string;
          listenedAt: Date;
          analyzedAt: Date;
        }[];

        const updatedLastfmListens = await prisma.lastfmListen.updateMany({
          where: {
            id: {
              in: unlinkedLastfmListensWithSameTrack.map(
                (listen) => listen.lastfmListenId
              ),
            },
          },
          data: {
            analyzedAt: new Date(),
          },
        });

        const track = await SpotifyService.getTrackFromTrackAndArtist(
          accessToken,
          lastfmListens[0].trackName,
          lastfmListens[0].artistName
        );
        track.mbid = lastfmListens[0].mbid;

        const savedTrack = await MusicStorage.upsertTrack(track);

        if (!savedTrack) {
          throw new TypedError("Could not save track", 500);
        }

        const newListens = await prisma.listen.createMany({
          data: unlinkedLastfmListensWithSameTrack.map((listen) => ({
            trackId: savedTrack.id,
            userId: user.id,
            listenedAt: listen.listenedAt,
            lastfmListenId: listen.lastfmListenId,
          })),
        });

        console.log(
          "created listens for",
          newListens.count,
          "lastfm listens from lastfm listen id",
          lastfmListenId,
          "Updated analyzedAt for",
          updatedLastfmListens.count,
          "lastfm listens"
        );

        res
          .status(200)
          .send(
            MusicUtils.convertPrismaTrackAndArtistsToTrack(
              savedTrack,
              savedTrack.artists || []
            )
          );
      }
    } catch (e: any) {
      handleErrorResponse(e, res);
    }
  }
);
