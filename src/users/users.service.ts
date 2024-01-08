import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { TypedError } from "../errors/errors.types";

import { getAccountInfo } from "../lastfm/lastfm.service";
import { User, UserWithId, UserWithLastfmAccountAndId } from "./users.types";
import { createUser as createUserFromPrisma } from "./users.utils";
import * as MusicService from "../music/music.service";

/*
 * Service Methods
 */

export async function testEndpoint(): Promise<string> {
  return "Users Service is Online";
}

/**
 * Retrieves a user by their ID.
 *
 * @param {number} userId - The ID of the user to retrieve.
 * @returns {Promise<UserWithId>} The user with the specified ID.
 * @throws {TypedError} If the user with the specified ID is not found or if there's an error in the retrieval process.
 */
export async function getUserById(userId: number): Promise<UserWithId> {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: {
        lastfmAccount: true,
      },
    });

    if (!user) {
      throw new TypedError(`User with id:${userId} not found.`, 404);
    }

    return createUserFromPrisma(user, user.lastfmAccount);
  } catch (e: any) {
    console.error(e);
    if (e instanceof TypedError) {
      throw e;
    }
    throw new TypedError(`Could not find user with id:${userId}`, 500);
  }
}

/**
 * Creates a new user by their Last.fm username, if a user with that username doesn't already exist.
 * If a user with that username already exists, the existing user is returned.
 *
 * @param {string} username - The Last.fm username of the user to create.
 * @returns {Promise<UserWithId>} The newly created user.
 * @throws {TypedError} If the user with the specified Last.fm username already exists or if there's an error in the creation process.
 */
export async function createUserByLastfmUsername(
  lastfmUsername: string
): Promise<UserWithLastfmAccountAndId> {
  try {
    const lastfmAccount = await getAccountInfo(lastfmUsername);
    // check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { lastfmAccount: { username: lastfmUsername } },
      include: {
        lastfmAccount: true,
      },
    });

    if (existingUser) {
      const user = createUserFromPrisma(
        existingUser,
        existingUser.lastfmAccount
      );
      return {
        ...user,
        lastfmAccount,
      };
    }

    // create user
    const user = await storeUser({
      lastfmAccount,
    });
    return {
      ...user,
      lastfmAccount,
    };
  } catch (e) {
    console.error(e);
    throw new TypedError(
      `Could not create user for lastfm username ${lastfmUsername}`,
      500
    );
  }
}

/**
 * Retrieves a User by their Last.fm username.
 *
 * @param {string} username - The Last.fm username of the user to retrieve.
 * @returns {Promise<UserWithId>} The user with the specified Last.fm username.
 * @throws {TypedError<404>} If the user with the specified Last.fm username is not found.
 * @throws {TypedError<500>} If there's an error in the retrieval process.
 */
export async function getUsersByLastfmUsername(
  username: string
): Promise<UserWithLastfmAccountAndId> {
  const user = await prisma.user.findFirst({
    where: { lastfmAccount: { username } },
    include: {
      lastfmAccount: true,
    },
  });

  if (!user) {
    throw TypedError.create(`User with username ${username} not found.`, 404);
  }

  return createUserFromPrisma(
    user,
    user.lastfmAccount
  ) as UserWithLastfmAccountAndId;
}

/**
 * Stores a new user in the database.
 *
 *
 * @param {UserWithId} user - The user to store.
 * @returns {Promise<UserWithId>} The stored user.
 * @throws {TypedError<400>} If the user with the specified Last.fm username already exists.
 * @throws {TypedError<500>} If there's an error in the storage process.
 */
export async function storeUser(user: User): Promise<UserWithId> {
  try {
    const checkUserResponse = await prisma.lastfmAccount.findFirst({
      where: { username: user.lastfmAccount?.username },
    });
    if (checkUserResponse) {
      throw new TypedError(
        `User with lastfm username: ${user.lastfmAccount?.username} already exists.`,
        400
      );
    }

    const prismaUser = await prisma.user.create({
      data: {
        lastfmAccount: {
          create: user.lastfmAccount,
        },
      },
      include: {
        lastfmAccount: true,
      },
    });

    return createUserFromPrisma(prismaUser, prismaUser.lastfmAccount);
  } catch (e) {
    console.error(e);
    throw new TypedError(`Could not store user: ${user}`, 500);
  }
}

/**
 * Retrieves all users from the database.
 *
 * @returns {Promise<UserWithId[]>} An array of all users.
 * @throws {TypedError<500>} If there's an error in the retrieval process.
 */
export async function getAllUsers(): Promise<UserWithId[]> {
  try {
    // get user info from database
    const users = await prisma.user.findMany({
      include: {
        lastfmAccount: true,
      },
    });

    // convert to User type
    return users.map((prismaUser) =>
      createUserFromPrisma(prismaUser, prismaUser.lastfmAccount)
    );
  } catch (error: any) {
    console.error("we got an error", error);
    throw new Error("Users could not be retrieved.");
  }
}

/**
 * Triggers an update of a user's listen history.
 *
 * @param {number} userId - The ID of the user whose listen history should be updated.
 * @returns {Promise<{BatchUpdateResponse}>} Resolves when the update has been triggered. It provides the status and the number of listens that will be imported.
 * @throws {TypedError<404>} If the user with the specified ID is not found.
 * @throws {TypedError<500>} If there's an error in the update process.
 */
export async function triggerUpdateListenHistoryByUserId(userId: number) {
  const user = await getUserById(userId);

  if (!user) {
    throw new TypedError(`User with id:${userId} not found.`, 404);
  }

  // trigger music service to update listens in the background
  const importSize = await MusicService.triggerUpdateListensForUser(user);

  // return status as started so long as an error is not thrown
  return {
    status: "started",
    listensToImport: importSize.numberOfNewListensToImport,
  };
}
