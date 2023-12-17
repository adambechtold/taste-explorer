import express, { Request, Response } from "express";
import querystring from "querystring";

import * as SpotifyService from "../spotify/spotify.service";

export const authRouter = express.Router();

authRouter.get("/login/spotify", (req: Request, res: Response) => {
  SpotifyService.redirectToLogin(res);
});

authRouter.get(
  SpotifyService.callbackEndpoint,
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
      await SpotifyService.handleLoginCallback(code);
      res.redirect("/");
    }
  }
);
