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

export async function getAllUsers(): Promise<User[]> {
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
