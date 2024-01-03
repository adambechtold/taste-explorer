import express, { Request, Response } from "express";
import { getCurrentUser } from "../auth/auth.utils";
import * as SpotifyService from "../spotify/spotify.service";
import { SpotifyAccessToken } from "../auth/auth.types";

export const playerRouter = express.Router();

playerRouter.get("/player/playlist", async (req: Request, res: Response) => {
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

  res.render("index", {
    title: "Taste Explorer",
    user,
    spotify: {
      isAuthorized: isSpotifyAuthorized,
      accessToken: spotifyAccessToken?.token,
    },
  });
});
