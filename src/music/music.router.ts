import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

import * as PlaylistService from "./playlists/playlists.service";

import {
  PreferenceType,
  isValidPreferenceType,
} from "./playlists/playlists.types";
import { TypedError } from "../errors/errors.types";
import { handleErrorResponse } from "../utils/response.utils";

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
