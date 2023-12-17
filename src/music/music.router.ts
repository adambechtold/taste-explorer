import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { TypedError } from "../errors/errors.types";
import { handleErrorResponse } from "../utils/response.utils";

import * as PlaylistService from "./playlists/playlists.service";
import * as SpotifyService from "../spotify/spotify.service";
import * as LastfmStorage from "../lastfm/lastfm.storage";

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

// -- Identify Track from LastfmListen ---
musicRouter.get(
  "/lastfm-listens/:id/spotify-track",
  async (req: Request, res: Response) => {
    try {
      const listenIdParam = req.params.id;

      if (!listenIdParam) {
        throw new TypedError("Listen ID is required", 400);
      }

      const listenId = parseInt(listenIdParam);

      if (isNaN(listenId)) {
        throw new TypedError("Listen ID must be a number", 400);
      }

      const lastfmListen = await prisma.lastfmListen.findUnique({
        where: {
          id: listenId,
        },
      });

      if (!lastfmListen) {
        throw new TypedError("Listen not found", 404);
      }

      const listen = await LastfmStorage.getLastfmListenById(listenId);

      const user = getCurrentUser(req);

      if (!user) {
        throw new TypedError("No sure found", 404);
      }

      const accessToken = await SpotifyService.getAccessToken(user);

      if (!accessToken) {
        throw new TypedError("No access token found for user", 404);
      }

      const track = await SpotifyService.getTrackFromLastfmListen(
        accessToken,
        listen
      );

      res.status(200).send(track);
    } catch (e: any) {
      handleErrorResponse(e, res);
    }
  }
);
