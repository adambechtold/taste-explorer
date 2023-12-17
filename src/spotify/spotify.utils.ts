import { PrismaClient } from "@prisma/client";
import { UserWithId } from "../users/users.types";
import { AccessToken } from "../auth/auth.types";

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
export async function getSpotifyAccessTokenForUser(
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

function getUserIdService(user: UserWithId): string {
  return `${user.id}-SPOTIFY`;
}
