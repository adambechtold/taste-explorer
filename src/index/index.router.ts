import express, { Request, Response } from "express";
import { getCurrentUser } from "../auth/auth.utils";
import * as SpotifyService from "../spotify/spotify.service";

export const indexRouter = express.Router();

indexRouter.get("/", async (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  let spotifyAccessToken = null;
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

  res.render("index", {
    title: "Music Taste Explorer",
    user,
    spotify: {
      isAuthorized: isSpotifyAuthorized,
      accessToken: spotifyAccessToken?.token,
    },
  });
});
