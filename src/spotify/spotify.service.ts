import { Response } from "express";

import { AccessToken } from "../auth/auth.types";
import { UserWithId } from "../users/users.types";

import * as SpotifyUtils from "./spotify.utils";
import SpotifyApi from "./spotify.api";

/**
 * Handles the callback from the Spotify login process, exchanging the authorization code for an access token.
 *
 * @param {string | null} code - The authorization code received from Spotify, or null if no code was received.
 * @returns {Promise<AccessToken>} A promise that resolves to an object containing the stored access token, refresh token, expiration date, and the service name ("SPOTIFY").
 * @throws {Error} Will throw an error if the request to the Spotify API fails, or if storing the access token in the database fails.
 */
export async function handleLoginCallback(
  code: string | null,
  user: UserWithId
): Promise<AccessToken> {
  const spotifyApi = new SpotifyApi();
  const accessToken = await spotifyApi.getAccessTokenFromCode(code);

  const savedAccessToken = await SpotifyUtils.storeSpotifyAccessTokenForUser(
    user,
    accessToken.token,
    accessToken.refreshToken,
    accessToken.expiresAt
  );

  return savedAccessToken;
}

/**
 * Retrieves the Spotify access token for a specific user.
 *
 * @param {UserWithId} user - The user for whom to retrieve the access token.
 * @returns {Promise<AccessToken | null>} A promise that resolves to the access token for the user, or null if no access token is found.
 */
export async function getAccessToken(
  user: UserWithId
): Promise<AccessToken | null> {
  return SpotifyUtils.getSpotifyAccessTokenForUser(user);
}

/**
 * Refreshes the Spotify access token for a specific user and stores the new token in the database.
 *
 * @param {AccessToken} accessToken - The current access token for the user.
 * @param {UserWithId} user - The user for whom to refresh the access token.
 * @returns {Promise<AccessToken>} A promise that resolves to the refreshed access token for the user.
 * @throws {Error} Will throw an error if the request to the Spotify API fails, or if storing the refreshed access token in the database fails.
 */
export async function refreshAccessToken(
  accessToken: AccessToken,
  user: UserWithId
): Promise<AccessToken> {
  const spotifyApi = new SpotifyApi(accessToken);
  const newAccessToken = await spotifyApi.refreshAccessToken();
  return SpotifyUtils.storeSpotifyAccessTokenForUser(
    user,
    newAccessToken.token,
    newAccessToken.refreshToken,
    newAccessToken.expiresAt
  );
}
