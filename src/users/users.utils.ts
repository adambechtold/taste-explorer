import {
  User as PrismaUser,
  LastfmAccount as PrismaLastfmAccount,
} from "@prisma/client";
import { UserWithId } from "./users.types";

export function createUser(
  prismaUser: PrismaUser,
  prismaLastfm?: PrismaLastfmAccount | null
): UserWithId {
  const user: UserWithId = {
    id: prismaUser.id,
  };

  if (prismaLastfm) {
    user.lastfmAccount = {
      username: prismaLastfm.username,
      registeredAt: prismaLastfm.registeredAt,
      url: prismaLastfm.url,
      playCount: prismaLastfm.playCount,
      trackCount: prismaLastfm.trackCount,
    };
  }

  return user;
}
