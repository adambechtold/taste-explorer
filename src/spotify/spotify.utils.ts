import { PrismaClient } from "@prisma/client";
import { UserWithId } from "../users/users.types";
import { AccessToken } from "../auth/auth.types";
import { SpotifyAccessTokenResponse } from "./spotify.types";

const prisma = new PrismaClient({ log: ["query"] });

/**
 * Retrieves the Spotify client ID from the environment variables.
 *
 * @returns {string} The Spotify client ID.
 * @throws {Error} Will throw an error if the SPOTIFY_CLIENT_ID environment variable is not set.
 */
export function getClientId(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing SPOTIFY_CLIENT_ID");
  }
  return clientId;
}

/**
 * Retrieves the Spotify client secret from the environment variables.
 *
 * @returns {string} The Spotify client secret.
 * @throws {Error} Will throw an error if the SPOTIFY_CLIENT_SECRET environment variable is not set.
 */
export function getClientSecret(): string {
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_SECRET");
  }
  return clientSecret;
}

/**
 * Stores or updates a Spotify access token for a user in the database.
 *
 * @param {UserWithId} user - The user object, which must include an id.
 * @param {string} accessToken - The Spotify access token to be stored.
 * @param {string} refreshToken - The Spotify refresh token to be stored.
 * @param {Date} expiresAt - The expiration date of the access token.
 * @returns {Promise<AccessToken>} A promise that resolves to an object containing the stored access token, refresh token, expiration date, and the service name ("SPOTIFY").
 * @throws {Error} Will throw an error if the database operation fails.
 */
export async function storeSpotifyAccessToken(
  user: UserWithId,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): Promise<AccessToken> {
  const userIdService = getUserIdService(user);
  const response = await prisma.accessToken.upsert({
    where: { userIdService },
    create: {
      userIdService,
      token: accessToken,
      refreshToken,
      expiresAt,
    },
    update: {
      token: accessToken,
      refreshToken,
      expiresAt,
    },
  });

  return {
    token: response.token,
    refreshToken: response.refreshToken,
    expiresAt: response.expiresAt,
    service: "SPOTIFY",
  };
}

/**
 * Retrieves a Spotify access token for a user from the database.
 *
 * @param {UserWithId} user - The user object, which must include an id.
 * @returns {Promise<AccessToken | null>} A promise that resolves to an object containing the stored access token, refresh token, expiration date, and the service name ("SPOTIFY"). If no access token is found, resolves to null.
 * @throws {Error} Will throw an error if the database operation fails.
 */
export async function getSpotifyAccessToken(
  user: UserWithId
): Promise<AccessToken | null> {
  const userIdService = getUserIdService(user);

  const accessToken = await prisma.accessToken.findUnique({
    where: { userIdService },
  });

  if (!accessToken) {
    return null;
  }

  return {
    token: accessToken.token,
    refreshToken: accessToken.refreshToken,
    expiresAt: accessToken.expiresAt,
    service: "SPOTIFY",
  };
}

/**
 * Retrieves a new Spotify access token for the user, using the refresh token.
 * Stores the new token in the database.
 *
 * @param {AccessToken} accessToken - The current access token object, which includes the refresh token.
 * @returns {Promise<AccessToken>} A promise that resolves to an object containing the new access token, the same refresh token, the new expiration date, and the service name ("SPOTIFY").
 * @throws {Error} Will throw an error if the request to the Spotify API fails, or if storing the new access token in the database fails.
 */
export async function refreshSpotifyToken(
  accessToken: AccessToken,
  user: UserWithId
): Promise<AccessToken> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(getClientId() + ":" + getClientSecret()).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: accessToken.refreshToken,
    }),
  });
  const body = (await response.json()) as SpotifyAccessTokenResponse;

  const newAccessToken = await storeSpotifyAccessToken(
    user,
    body.access_token,
    accessToken.refreshToken,
    new Date(Date.now() + body.expires_in * 1000)
  );

  return newAccessToken;
}

function getUserIdService(user: UserWithId): string {
  return `${user.id}-SPOTIFY`;
}
