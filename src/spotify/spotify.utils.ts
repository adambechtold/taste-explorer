import { PrismaClient } from "@prisma/client";
import { UserWithId } from "../users/users.types";
import { SpotifyAccessToken } from "../auth/auth.types";
import { SpotifyAudioFeaturesResponse } from "./spotify.types";
import { TrackFeatures } from "../music/music.types";

const prisma = new PrismaClient();

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
export async function storeSpotifyAccessTokenForUser(
  user: UserWithId,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): Promise<SpotifyAccessToken> {
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
 * @returns {Promise<SpotifyAccessToken | null>} A promise that resolves to an object containing the stored access token, refresh token, expiration date, and the service name ("SPOTIFY"). If no access token is found, resolves to null.
 * @throws {Error} Will throw an error if the database operation fails.
 */
export async function getSpotifyAccessTokenForUser(
  user: UserWithId
): Promise<SpotifyAccessToken | null> {
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

function getUserIdService(user: UserWithId): string {
  return `${user.id}-SPOTIFY`;
}

export function convertSpotifyTrackFeaturesResponseToTrackFeatures(
  response: SpotifyAudioFeaturesResponse
): TrackFeatures {
  return {
    acousticness: response.acousticness,
    danceability: response.danceability,
    duration: response.duration_ms,
    energy: response.energy,
    instrumentalness: response.instrumentalness,
    key: response.key,
    liveness: response.liveness,
    loudness: response.loudness,
    mode: response.mode === 1 ? "MAJOR" : "MINOR",
    speechiness: response.speechiness,
    tempo: response.tempo,
    timeSignature: response.time_signature,
    valence: response.valence,
  };
}
