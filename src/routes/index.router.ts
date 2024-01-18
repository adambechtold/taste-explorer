import express, { Request, Response } from "express";
import { getCurrentUser } from "../auth/auth.utils";

import * as UserService from "../users/users.service";
import * as SpotifyService from "../spotify/spotify.service";

import { SpotifyAccessToken } from "../auth/auth.types";
import { isValidPreferenceType } from "../music/playlists/playlists.types";
import { secondsToTimeFormat } from "../utils/datetime.utils";
import { NotFoundError, TypedError } from "../errors/errors.types";
import { handleErrorResponse } from "../utils/response.utils";
import { UserWithLastfmAccountAndId } from "../users/users.types";

export const indexRouter = express.Router();

indexRouter.get("/", async (req: Request, res: Response) => {
  const user1Username = req.query.user1 as string;
  const user2Username = req.query.user2 as string;

  if (user1Username || user2Username) {
    res.redirect(
      `/taste-comparison?user1=${user1Username}&user2=${user2Username}`
    );
    return;
  }

  const users = await UserService.getAllUsers();
  const usersWithLastfmAccounts = users.filter(
    (user) => !!user.lastfmAccount && !!user.lastfmAccount.username
  ) as UserWithLastfmAccountAndId[];

  res.render("configure-comparison", {
    users: sortUsersByLastfmUsername(usersWithLastfmAccounts),
  });
});

indexRouter.get("/taste-comparison", async (req: Request, res: Response) => {
  const user1Username = req.query.user1 as string;
  const user2Username = req.query.user2 as string;
  const user1Id = req.query.user1Id as string;
  const user2Id = req.query.user2Id as string;

  const preferenceType = req.query.preferenceType as string;

  // check if the users are valid
  let user1: UserWithLastfmAccountAndId | null = null;
  let user2: UserWithLastfmAccountAndId | null = null;

  // check if the preference type is valid
  if (preferenceType) {
    if (!isValidPreferenceType(preferenceType)) {
      res.status(400).send("Invalid preference type.");
      return;
    }
  }

  try {
    if (user1Id && !isNaN(parseInt(user1Id))) {
      user1 = await UserService.getUserById(parseInt(user1Id));
    } else {
      user1 = await UserService.getUsersByLastfmUsername(user1Username);
    }
  } catch (e: any) {
    if (e instanceof TypedError && e instanceof NotFoundError) {
      // Continue. Let's check user2.
    } else {
      handleErrorResponse(e, res);
    }
  }

  try {
    if (user2Id && !isNaN(parseInt(user2Id))) {
      user2 = await UserService.getUserById(parseInt(user2Id));
    } else {
      user2 = await UserService.getUsersByLastfmUsername(user2Username);
    }
  } catch (e: any) {
    if (e instanceof TypedError && e instanceof NotFoundError) {
      // Continue. We'll handle not found below.
    } else {
      handleErrorResponse(e, res);
    }
  }

  if (user1 && user2) {
    res.render("taste-comparison", {
      secondsToTimeFormat: secondsToTimeFormat,
      user1,
      user2,
      preferenceType: preferenceType,
    });
  } else {
    const users = await UserService.getAllUsers();
    const usersWithLastfmAccounts = users.filter(
      (user) => !!user.lastfmAccount && !!user.lastfmAccount.username
    ) as UserWithLastfmAccountAndId[];

    res.render("configure-comparison", {
      users: sortUsersByLastfmUsername(usersWithLastfmAccounts),
      user1: user1 ? user1 : undefined,
      user2: user2 ? user2 : undefined,
      error: {
        message:
          "Choose one of the provided last.fm accounts to compare. The ability to add new accounts is coming soon.",
      },
    });
  }
});

indexRouter.get("/debug", async (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  let spotifyAccessToken: SpotifyAccessToken | null = null;
  let isSpotifyAuthorized = false;

  if (user) {
    spotifyAccessToken = await SpotifyService.getAccessToken(user);

    if (spotifyAccessToken) {
      if (spotifyAccessToken.expiresAt < new Date()) {
        spotifyAccessToken = await SpotifyService.refreshAccessToken(
          spotifyAccessToken,
          user
        );
      }

      isSpotifyAuthorized = true;
    }
  }

  res.render("debug", {
    user,
    spotify: {
      isAuthorized: isSpotifyAuthorized,
      accessToken: spotifyAccessToken?.token,
    },
  });
});

function sortUsersByLastfmUsername(users: UserWithLastfmAccountAndId[]) {
  return users.sort((a, b) => {
    if (
      (a.lastfmAccount.username?.toLocaleLowerCase() as string) <
      (b.lastfmAccount.username?.toLocaleLowerCase() as string)
    ) {
      return -1;
    }
    if (
      (a.lastfmAccount.username?.toLocaleLowerCase() as string) >
      (b.lastfmAccount.username?.toLocaleLowerCase() as string)
    ) {
      return 1;
    }
    return 0;
  });
}
