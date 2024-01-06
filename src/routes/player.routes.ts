import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { TypedError } from "../errors/errors.types";
import { handleErrorResponse } from "../utils/response.utils";

import { secondsToTimeFormat } from "../utils/datetime.utils";

import {
  PreferenceType,
  isValidPreferenceType,
} from "../music/playlists/playlists.types";
import * as PlaylistService from "../music/playlists/playlists.service";

const prisma = new PrismaClient();

export const playerRouter = express.Router();

playerRouter.get("/playlist", async (req: Request, res: Response) => {
  try {
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

    if (!user1 || !user2) {
      throw new TypedError("User not found", 404);
    }

    const playlist = await PlaylistService.getPlaylist(
      user1,
      user2,
      preferenceType as PreferenceType
    );

    res.render("partials/playlist", {
      tracks: playlist.tracks.items,
    });
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});

/**
 * Returns the music player partial view
 */
playerRouter.get("/music-player", (req: Request, res: Response) => {
  res.render("../views/partials/music-player", {
    secondsToTimeFormat,
    track: {
      imageUrl:
        "https://media.giphy.com/media/DhstvI3zZ598Nb1rFf/giphy-downsized.gif",
      name: "...Loading Tracks...",
      artists: [],
    },
    playState: {
      trackPosition: 0,
      trackDuration: 60,
    },
  });
});
