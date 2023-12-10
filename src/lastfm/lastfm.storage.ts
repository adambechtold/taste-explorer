import { UserWithId } from "../users/users.types";
import { LastfmListen } from "./lastfm.types";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function storeListenBatch(
  listens: LastfmListen[],
  user: UserWithId
): Promise<Prisma.BatchPayload> {
  if (!user.lastfmAccount) {
    throw new Error(
      `Cannot store listens for user without lastfm account: ${user.id}`
    );
  }
  type UserWithLastfm = UserWithId & { lastfmAccount: { username: string } };
  const userWithLastfm = user as UserWithLastfm;

  if (
    listens.filter(
      (l) => l.lastfmAccount.username !== userWithLastfm.lastfmAccount.username
    ).length
  ) {
    throw new Error(
      `Cannot store listens for user ${user.lastfmAccount.username} with listens for other users.`
    );
  }

  type ListenWithDate = LastfmListen & { date: Date };

  const filteredListens = listens.filter((l) => l.date) as ListenWithDate[];

  return prisma.lastfmListen.createMany({
    data: filteredListens.map((l) => ({
      userId: user.id,
      listenedAt: l.date,
      trackData: l.track,
    })),
  });
}
