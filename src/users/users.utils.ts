import {
  User as PrismaUser,
  lastfmAccount as PrismalastfmAccount,
} from "@prisma/client";
import { User } from "./users.types";

export function createUser(
  prismaUser: PrismaUser,
  prismalastfm?: PrismalastfmAccount | null
): User {
  const user: User = {
    id: prismaUser.id,
  };

  if (prismalastfm) {
    user.lastfmAccount = {
      username: prismalastfm.username,
      registeredAt: prismalastfm.registeredAt,
      url: prismalastfm.url,
      playCount: prismalastfm.playCount,
      trackCount: prismalastfm.trackCount,
    };
  }

  return user;
}
