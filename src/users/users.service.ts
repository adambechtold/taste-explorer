import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import { LastFmAccountInfoResponse } from "../lastfm/lastfm.types";
import { createLastFmAccount } from "../lastfm/lastfm.utils";
import { User } from "./users.types";
import { createUser as createUserFromPrisma } from "./users.utils";

import fs from "fs/promises";
const EXAMPLE_USER_FILENAME = __dirname + "/../data/userinfo-atomicGravy.json";

/*
 * Service Methods
 */

export async function testEndpoint(): Promise<string> {
  return "Users Service is Online";
}

export async function createUser(lastFmUsername: string) {
  try {
    // get user info from lastfm
    const data = await fs.readFile(EXAMPLE_USER_FILENAME);
    const lastFmResponse: LastFmAccountInfoResponse = JSON.parse(
      data.toString()
    );
    const lastFmAccount = createLastFmAccount(lastFmResponse);

    const user = await prisma.user.create({
      data: {
        lastFmAccount: {
          create: lastFmAccount,
        },
      },
    });
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
    throw new Error("User Not Found");
  }
}
