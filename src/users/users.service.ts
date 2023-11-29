import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import { getAccountInfo } from "../lastfm/lastfm.service";
import { User } from "./users.types";
import { createUser as createUserFromPrisma } from "./users.utils";

/*
 * Service Methods
 */

export async function testEndpoint(): Promise<string> {
  return "Users Service is Online";
}

export async function getUserByUsername(lastFmUsername: string): Promise<User> {
  try {
    const user = await prisma.user.findFirst({
      where: { lastFmAccount: { username: lastFmUsername } },
      include: {
        lastFmAccount: true,
      },
    });

    if (!user) {
      console.log("Let's create a user");
      return createUserByUsername(lastFmUsername);
    }

    return createUserFromPrisma(user, user.lastFmAccount);
  } catch (e) {
    console.error(e);
    throw new Error(
      `Could not create user for lastfm username: ${lastFmUsername}`
    );
  }
}

async function createUserByUsername(lastFmUsername: string): Promise<User> {
  if (!lastFmUsername) {
    throw new Error("Missing LastFM Username");
  }

  if (lastFmUsername !== "atomicGravy") {
    throw new Error(
      "Can only create users from atomicGravy. Other users not supported."
    );
  }

  const lastFmAccount = await getAccountInfo(lastFmUsername);

  try {
    const response = await prisma.user.create({
      data: {
        lastFmAccount: {
          create: lastFmAccount,
        },
      },
    });
    const user = await prisma.user.findFirst({
      where: { id: response.id },
      include: {
        lastFmAccount: true,
      },
    });

    return createUserFromPrisma(response, user?.lastFmAccount);
  } catch (e) {
    console.error(e);
    throw new Error(
      `Could not create user for lastfm username: ${lastFmUsername}`
    );
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    // get user info from database
    const users = await prisma.user.findMany({
      include: {
        lastFmAccount: true,
      },
    });

    // convert to User type
    return users.map((prismaUser) =>
      createUserFromPrisma(prismaUser, prismaUser.lastFmAccount)
    );
  } catch (error: any) {
    console.error("we got an error", error);
    throw new Error("Users could not be retrieved.");
  }
}

export async function deleteUserById(userId: number): Promise<User> {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: {
        lastFmAccount: true,
      },
    });
    if (!user) {
      throw new Error(`User with id:${userId} not found.`);
    }
    if (user.lastFmAccount) {
      await prisma.lastFmAccount.delete({
        where: { id: user.lastFmAccount.id },
      });
    }

    await prisma.user.delete({
      where: { id: userId },
      include: {
        lastFmAccount: true,
      },
    });

    return createUserFromPrisma(user, user.lastFmAccount);
  } catch (error: any) {
    console.error("we got an error", error);
    throw new Error("User could not be deleted.");
  }
}
