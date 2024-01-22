import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  NotAuthorizedError,
  NotFoundError,
  TypedError,
} from "../errors/errors.types";
import { handleErrorResponse } from "../utils/response.utils";
import { getCurrentUser } from "../auth/auth.utils";

import * as PlaylistService from "./playlists/playlists.service";
import * as MusicService from "./music.service";
import * as MusicUtils from "./music.utils";

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

      const track = await MusicService.getTrackFromLastfmListenId(
        lastfmListenId
      );

      if (!track) {
        throw new TypedError(
          "Could not find track in database or spotify",
          404
        );
      }

      res.status(200).send(track);
    } catch (e: any) {
      handleErrorResponse(e, res);
    }
  }
);

musicRouter.get("/track-features/:trackId", async (req, res) => {
  try {
    const trackIdParam = req.params.trackId;

    if (!trackIdParam) {
      throw new TypedError("Track ID is required", 400);
    }

    const trackId = parseInt(trackIdParam);

    if (isNaN(trackId)) {
      throw new TypedError("Track ID must be a number", 400);
    }

    const prismaTrack = await prisma.track.findUnique({
      where: {
        id: trackId,
      },
    });

    if (!prismaTrack) {
      throw TypedError.create("Could not find track", 404);
    }

    const track = MusicUtils.convertPrismaTrackAndArtistsToTrack(
      prismaTrack,
      []
    );

    const trackFeatures = await MusicService.addFeaturesToTracks([track]);

    if (!trackFeatures) {
      throw TypedError.create("Could not find track features", 404);
    }

    res.status(200).send(trackFeatures);
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});

/* Play Track
 * Plays a track on the user's Spotify account.
 */
musicRouter.put("/play-track/:trackId", async (req, res) => {
  const trackIdParam = req.params.trackId;

  if (!trackIdParam) {
    throw TypedError.create("Track ID is required", 400);
  }

  const trackId = parseInt(trackIdParam);

  if (isNaN(trackId)) {
    throw TypedError.create("Track ID must be a number", 400);
  }

  await MusicService.playTracks([trackId], 0, req.session.id);

  res.status(204).send();
});

/* Play Tracks
 * Plays a list of tracks on the user's Spotify account.
 */
musicRouter.put("/play-tracks", async (req, res) => {
  try {
    const trackIdsParam = req.body.trackIds as string[];
    let offsetParam = req.body.offset as string;

    if (!trackIdsParam) {
      throw TypedError.create("Track IDs are required", 400);
    }

    const trackIds = trackIdsParam.map((id) => parseInt(id));
    let offset = parseInt(offsetParam);

    if (isNaN(offset)) {
      offset = 0;
    }

    await MusicService.playTracks(trackIds, offset, req.session.id);

    res.status(204).send();
  } catch (e: any) {
    if (e instanceof TypedError) {
      if (e instanceof NotFoundError) {
        if (e.message.includes("No active device found")) {
          res.render("partials/snackbar", {
            message:
              "No Spotify active devices found. Start playing in another app or transfer playback to this device.",
          });
          return;
        }
      }
      if (e instanceof NotAuthorizedError) {
        res.render("partials/snackbar", {
          message: "Please login to Spotify to start listening.",
        });
        return;
      }
    }

    handleErrorResponse(e, res);
  }
});

/* Transfer Playback to Device
 * Transfers playback to a device.
 */
musicRouter.put("/transfer-playback", async (req, res) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      throw TypedError.create("User not found", 404);
    }

    const deviceId = req.body.deviceId as string;

    if (!deviceId) {
      throw TypedError.create("Device ID is required", 400);
    }

    await MusicService.transferPlaybackToUserDevice(deviceId, user);

    res.status(204).send();
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});
