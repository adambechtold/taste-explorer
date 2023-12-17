import { Response } from "express";
import querystring from "querystring";

import { generateRandomString } from "../utils/string.utils";
import { AccessToken } from "../auth/auth.types";
import { SpotifyAccessTokenResponse } from "./spotify.types";
import * as SpotifyUtils from "./spotify.utils";
import { UserWithId } from "../users/users.types";

/**
 * Spotify Services
 */
const clientId = SpotifyUtils.getClientId();
const clientSecret = SpotifyUtils.getClientSecret();

export const callbackEndpoint = "/login/spotify/callback";
export const redirectUri = "http://localhost:4000/auth" + callbackEndpoint;

/**
 * Redirects the user to the Spotify login page for authentication.
 *
 * @param {Response} res - The Express response object.
 */
export function redirectToLogin(res: Response) {
  const state = generateRandomString(16);
  const scope = "user-read-private user-read-email";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: clientId,
        scope: scope,
        redirect_uri: redirectUri,
        state: state,
      })
  );
}

/**
 * Handles the callback from the Spotify login process, exchanging the authorization code for an access token.
 *
 * @param {string | null} code - The authorization code received from Spotify, or null if no code was received.
 * @returns {Promise<AccessToken>} A promise that resolves to an object containing the stored access token, refresh token, expiration date, and the service name ("SPOTIFY").
 * @throws {Error} Will throw an error if the request to the Spotify API fails, or if storing the access token in the database fails.
 */
export async function handleLoginCallback(
  code: string | null
): Promise<AccessToken> {
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    },
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(clientId + ":" + clientSecret).toString("base64"),
    },
    json: true,
  };

  const authTokenResponse = await fetch(authOptions.url, {
    method: "POST",
    headers: authOptions.headers,
    body: querystring.stringify(authOptions.form),
  });

  const authTokenJson =
    (await authTokenResponse.json()) as SpotifyAccessTokenResponse;

  const accessToken = await SpotifyUtils.storeSpotifyAccessToken(
    { id: 1 },
    authTokenJson.access_token,
    authTokenJson.refresh_token,
    new Date(Date.now() + authTokenJson.expires_in * 1000)
  );

  return accessToken;
}

export async function getAccessToken(
  user: UserWithId
): Promise<AccessToken | null> {
  return SpotifyUtils.getSpotifyAccessToken(user);
}

export async function refreshAccessToken(
  accessToken: AccessToken,
  user: UserWithId
): Promise<AccessToken> {
  return SpotifyUtils.refreshSpotifyToken(accessToken, user);
}
