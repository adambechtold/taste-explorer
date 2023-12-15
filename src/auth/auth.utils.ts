import { Request } from "express";
import { PrismaClient } from "@prisma/client";
import { UserWithId } from "../users/users.types";
import { AccessToken } from "./auth.types";

const prisma = new PrismaClient({ log: ["query"] });

function getUserIdService(user: UserWithId): string {
  return `${user.id}-SPOTIFY`;
}

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

export function getCurrentUser(req: Request): UserWithId | null {
  return { id: 1 };
}
