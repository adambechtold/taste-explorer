import express, { Request, Response } from "express";
import { getCurrentUser, getSpotifyAccessToken } from "../auth/auth.utils";

export const indexRouter = express.Router();

indexRouter.get("/", async (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  let spotifyAccessToken = null;
  let isSpotifyAuthorized = false;

  if (user) {
    spotifyAccessToken = await getSpotifyAccessToken(user);
    isSpotifyAuthorized =
      spotifyAccessToken !== null && spotifyAccessToken.expiresAt > new Date();
  }

  res.render("index", {
    title: "Music Taste Explorer",
    spotify: { isAuthorized: isSpotifyAuthorized },
  });
});
