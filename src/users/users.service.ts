import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { TypedError } from "../errors/errors.types";

import { getAccountInfo } from "../lastfm/lastfm.service";
import { User } from "./users.types";
import { createUser as createUserFromPrisma } from "./users.utils";
import { ListenHistoryUpdate } from "../music/music.types";
import * as MusicService from "../music/music.service";

/*
 * Service Methods
 */

export async function testEndpoint(): Promise<string> {
  return "Users Service is Online";
}

export async function getUserById(userId: number): Promise<User> {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: {
        lastfmAccount: true,
      },
    });

    if (!user) {
      throw new TypedError(
        `User with id:${userId} not found.`,
        404,
        "NOT_FOUND"
      );
    }

    return createUserFromPrisma(user, user.lastfmAccount);
  } catch (e: any) {
    console.error(e);
    if (e instanceof TypedError) {
      throw e;
    }
    throw new TypedError(
      `Could not find user with id:${userId}`,
      500,
      "INTERNAL_SERVER_ERROR"
    );
  }
}

export async function createUserByLastfmUsername(
  lastfmUsername: string
): Promise<User> {
  const lastfmAccount = await getAccountInfo(lastfmUsername);

  try {
    // check if user already exists
    const checkUserResponse = await prisma.user.findFirst({
      where: { lastfmAccount: { username: lastfmUsername } },
      include: {
        lastfmAccount: true,
      },
    });
    if (checkUserResponse) {
      return createUserFromPrisma(
        checkUserResponse,
        checkUserResponse.lastfmAccount
      );
    }

    // create user
    const response = await prisma.user.create({
      data: {
        lastfmAccount: {
          create: lastfmAccount,
        },
      },
    });
    const user = await prisma.user.findFirst({
      where: { id: response.id },
      include: {
        lastfmAccount: true,
      },
    });

    return createUserFromPrisma(response, user?.lastfmAccount);
  } catch (e) {
    console.error(e);
    throw new TypedError(
      `Could not create user for lastfm username: ${lastfmUsername}`,
      500,
      "INTERNAL_SERVER_ERROR"
    );
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

export async function updateListenHistory(
  username: string
): Promise<ListenHistoryUpdate> {
  if (!username) {
    throw new Error("Missing lastfm Username");
  }

  const newListens = await MusicService.updateListensForUserByUsername(
    username
  );
  return {
    newListensCount: newListens.length,
    result: "success",
  };
}
