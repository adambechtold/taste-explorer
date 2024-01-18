import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

import { TypedError, NotFoundError } from "../errors/errors.types";
import { handleErrorResponse } from "../utils/response.utils";

import { secondsToTimeFormat } from "../utils/datetime.utils";

import {
  PreferenceType,
  isValidPreferenceType,
} from "../music/playlists/playlists.types";
import * as PlaylistService from "../music/playlists/playlists.service";
import { UserWithLastfmAccountAndId } from "../users/users.types";
import { getUserById, getUsersByLastfmUsername } from "../users/users.service";

const prisma = new PrismaClient();

export const playerRouter = express.Router();

playerRouter.get("/select-playlist", async (req: Request, res: Response) => {
  const user1Username = req.query.user1 as string;
  const user2Username = req.query.user2 as string;
  const user1Id = req.query.user1Id as string;
  const user2Id = req.query.user2Id as string;
  const preferenceType = req.query.preferenceType as string;

  let user1: UserWithLastfmAccountAndId | null = null;
  let user2: UserWithLastfmAccountAndId | null = null;

  if (preferenceType) {
    if (!isValidPreferenceType(preferenceType)) {
      res.status(400).send("Invalid preference type.");
      return;
    }
  }

  try {
    if (user1Id && !isNaN(parseInt(user1Id))) {
      user1 = await getUserById(parseInt(user1Id));
    } else {
      user1 = await getUsersByLastfmUsername(user1Username);
    }
  } catch (e: any) {
    if (e instanceof TypedError && e instanceof NotFoundError) {
      // continue
    } else {
      handleErrorResponse(e, res);
    }
  }

  try {
    if (user2Id && !isNaN(parseInt(user2Id))) {
      user2 = await getUserById(parseInt(user2Id));
    } else {
      user2 = await getUsersByLastfmUsername(user2Username);
    }
  } catch (e: any) {
    if (e instanceof TypedError && e instanceof NotFoundError) {
      // continue
    } else {
      handleErrorResponse(e, res);
    }
  }

  if (!user1 || !user2) {
    res.status(404).send("User not found.");
    return;
  }

  res.render("partials/select-playlist", {
    user1,
    user2,
    preferenceType,
  });
});

playerRouter.get("/playlist", async (req: Request, res: Response) => {
  try {
    const userId1 = parseInt(req.query.user1Id as string);
    const userId2 = parseInt(req.query.user2Id as string);
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

    const tracks = playlist.tracks.items.map((item, index) => {
      return {
        ...item,
        image: isPlayingImages[index % isPlayingImages.length],
      };
    });

    res.render("partials/playlist", {
      tracks,
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

const isPlayingImages = [
  {
    src: "https://media.giphy.com/media/3bE8vLlScDrNUC9FL5/giphy.gif",
    alt: "Cartoon of a man bobbing is head and listening to music.",
  },
  {
    src: "https://media.giphy.com/media/lqSDx8SI1916ysr4eq/giphy.gif",
    alt: "Cartoon of a little bear with headphones listening to music.",
  },
  {
    src: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3AwanhpdW9mdW45dmpsemxkMW1qOTc4MmhzeHR4eG90NWxncnE2eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4oMoIbIQrvCjm/giphy.gif",
    alt: "Bart Simpson wearing headphones listening to music.",
  },
  {
    src: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXU4YXRtZTk2d3ZkcWFoc3Rhd20wenQ4MTk1Mnprbzd6aGF5MTM3dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tbapfDZ4mZJn2/giphy.gif",
    alt: "Cartoon of Jimmy Pesto Jr. from Bob's Burgers dancing to music.",
  },
  {
    src: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXBuNjRmNGpzcTR0YWRhYTJpbmkzM2owcWh2ZHZjbHUzcmE1b2Q4eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKHWeNw29DuZ6ocZa/giphy.gif",
    alt: "Cartoon of Patrick Star from Spongebob Squarepants playing the drums.",
  },
  {
    src: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjdiZTNjcWJnbmNocXN3b3JiZnA5bTc4am5mYnlxdHZldHJqeG8ydSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Y0GyZQpjqafoatTvjB/giphy.gif",
    alt: "Cartoon of a bird with headphones on listening to music.",
  },
  {
    src: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWE0M2U1OTI1MTQ5NDE3czNuYXBzdzB4dDhid2pyMmt1amhrMW9weSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/YgsGYbakNrZg3sVmop/giphy.gif",
    alt: "Cartoon of a man slowly playing the piano, pressing just one key at a time.",
  },
  {
    src: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2d1ZmtiOTRjdm1iZ2NyYWMzamFhMWtydXhoejA4c3VjaG52dnpxciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/y2B9WU8Yl0rIs/giphy.gif",
    alt: "Cartoon of Spongebob Squarepants playing the guitar.",
  },
];
