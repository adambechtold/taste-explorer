import express, { Request, Response } from "express";
import querystring from "querystring";

import * as SpotifyService from "../spotify/spotify.service";
import { getSpotifyAccessTokenForSessionId } from "../spotify/spotify.storage";
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
  const user1username = req.query.user1username as string;
  const user2username = req.query.user2username as string;

  // Add a taste comparison object to the session if it doesn't exist
  if (!req.session.tasteComparison) {
    req.session.tasteComparison = {};
  }

  // Add the users to the taste comparison object
  if (user1username) {
    req.session.tasteComparison.user1username = user1username;
  }
  if (user2username) {
    req.session.tasteComparison.user2username = user2username;
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
          }),
      );
    } else {
      /**
       * Right now, the User is null because we don't have users sign in.
       *
       * We still do need to have user 1's access token, so we can research information from spotify
       * If that needs to be updated. This line will have to be updated manually.
       * Use the getCurrentUser(req) function
       */
      await SpotifyService.handleLoginCallback(code, null, req.session.id);

      if (req.session.tasteComparison) {
        const user1 = req.session.tasteComparison.user1username;
        const user2 = req.session.tasteComparison.user2username;

        if (user1 && user2) {
          res.redirect(
            `/taste-comparison?user1=${user1}&user2=${user2}&spotifyLogin=true`,
          );
        } else {
          res.redirect("/");
        }
      } else {
        res.redirect("/");
      }
    }
  },
);

/**
 * Get Spotify Access Token
 * Returns the user's Spotify access token.
 */
authRouter.get("/spotify/token", async (req: Request, res: Response) => {
  try {
    const token = getSpotifyAccessTokenForSessionId(req.session.id);

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
