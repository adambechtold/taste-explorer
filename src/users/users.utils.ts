import {
  User as PrismaUser,
  LastFmAccount as PrismaLastFmAccount,
} from "@prisma/client";
import { User } from "./users.types";

export function createUser(
  prismaUser: PrismaUser,
  prismaLastFm?: PrismaLastFmAccount | null
): User {
  const user: User = {
    id: prismaUser.id,
  };

  if (prismaLastFm) {
    user.lastFmAccount = {
      username: prismaLastFm.username,
      registeredAt: prismaLastFm.registeredAt,
      url: prismaLastFm.url,
      playCount: prismaLastFm.playCount,
      trackCount: prismaLastFm.trackCount,
    };
  }

  return user;
}
