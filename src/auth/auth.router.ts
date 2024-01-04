import express, { Request, Response } from "express";
import querystring from "querystring";

import * as SpotifyService from "../spotify/spotify.service";
import { getCurrentUser } from "./auth.utils";
import SpotifyApi from "../spotify/spotify.api";
import { handleErrorResponse } from "../utils/response.utils";
import { TypedError } from "../errors/errors.types";

const spotifyApi = new SpotifyApi();

export const authRouter = express.Router();

/**
 * Spotify Login
 * Redirects the user to the Spotify login page.
 */
authRouter.get("/login/spotify", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) {
    throw new Error("User not found");
  }
  res.redirect(spotifyApi.getUrlToRedirectToLogin());
});

/**
 * Spotify Login Callback
 * Handles the callback from the Spotify login process, exchanging the authorization code for an access token.
 */
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

/**
 * Get Spotify Access Token
 * Returns the user's Spotify access token.
 */
authRouter.get("/spotify/token", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      throw new Error("User not found");
    }
    const token = await SpotifyService.getAccessToken(user);

    if (!token) {
      throw TypedError.create("Spotify token not found", 401);
    }

    res.json({
      token: token.token,
      expiresAt: token.expiresAt,
      service: "SPOTIFY",
    });
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});
