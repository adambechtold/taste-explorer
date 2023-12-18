import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { TypedError } from "../errors/errors.types";
import { handleErrorResponse } from "../utils/response.utils";

import * as PlaylistService from "./playlists/playlists.service";
import * as SpotifyService from "../spotify/spotify.service";
import * as MusicUtils from "./music.utils";
import * as MusicStorage from "./music.storage";

import { getCurrentUser } from "../auth/auth.utils";

import {
  PreferenceType,
  isValidPreferenceType,
} from "./playlists/playlists.types";

const prisma = new PrismaClient({ log: ["query"] });

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

// -- Identify Track from LastfmListen ---
musicRouter.get(
  "/lastfm-listens/:id/spotify-track",
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
        console.log("found listen!");
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
        // No track found. Try to get it from Spotify.

        const lastfmListen = (await prisma.$queryRaw`
          SELECT 
            trackData->>'$.name' as trackName, 
            trackData->>'$.artist.name' as artistName
          FROM LastfmListen
          WHERE id = ${lastfmListenId}
          LIMIT 1`) as
          | {
              trackName: string;
              artistName: string;
            }[]
          | null;

        if (!lastfmListen || lastfmListen.length === 0) {
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

        const track = await SpotifyService.getTrackFromTrackAndArtist(
          accessToken,
          lastfmListen[0].trackName,
          lastfmListen[0].artistName
        );

        const savedTrack = await MusicStorage.upsertTrack(track);

        if (!savedTrack) {
          throw new TypedError("Could not save track", 500);
        }

        // store track in a listen
        await MusicStorage.createListen(
          savedTrack.id,
          user.id,
          new Date(),
          lastfmListenId
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
