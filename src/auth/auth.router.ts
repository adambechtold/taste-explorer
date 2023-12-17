import express, { Request, Response } from "express";
import querystring from "querystring";

import * as SpotifyService from "../spotify/spotify.service";
import { getCurrentUser } from "./auth.utils";
import SpotifyApi from "../spotify/spotify.api";

const spotifyApi = new SpotifyApi();

export const authRouter = express.Router();

authRouter.get("/login/spotify", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) {
    throw new Error("User not found");
  }
  res.redirect(spotifyApi.getUrlToRedirectToLogin());
});

authRouter.get(
  spotifyApi.getCallbackEndpoint(),
  async (req: Request, res: Response) => {
    const code = (req.query.code as string) || null;
    const state = req.query.state || null;

    if (state === null) {
      // TODO: Implement state checker
      res.redirect(
        "/#" +
          querystring.stringify({
            error: "state_mismatch",
          })
      );
    } else {
      const user = getCurrentUser(req);
      if (!user) {
        throw new Error("User not found");
      }

      await SpotifyService.handleLoginCallback(code, user);
      res.redirect("/");
    }
  }
);
