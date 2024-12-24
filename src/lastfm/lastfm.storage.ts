import { LastfmListenNotFoundError } from "../errors/errors.types";
import { UserWithId } from "../users/users.types";
import { LastfmListen } from "./lastfm.types";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Stores a batch of last.fm listens for a specific user in the database.
 *
 * @param {LastfmListen[]} listens - An array of Last.fm listens to store.
 * @param {UserWithId} user - The user for whom to store the listens.
 * @returns {Promise<Prisma.BatchPayload>} A promise that resolves to a BatchPayload object that contains information about the operation.
 * @throws {Error} Will throw an error if the user does not have a Last.fm account, or if the listens array contains listens for other users.
 */
export async function storeListenBatch(
  listens: LastfmListen[],
  user: UserWithId,
): Promise<Prisma.BatchPayload> {
  if (!user.lastfmAccount) {
    throw new Error(
      `Cannot store listens for user without lastfm account: ${user.id}`,
    );
  }
  type UserWithLastfm = UserWithId & { lastfmAccount: { username: string } };
  const userWithLastfm = user as UserWithLastfm;

  if (
    listens.filter(
      (l) => l.lastfmAccount.username !== userWithLastfm.lastfmAccount.username,
    ).length
  ) {
    throw new Error(
      `Cannot store listens for user ${user.lastfmAccount.username} with listens for other users.`,
    );
  }

  type ListenWithDate = LastfmListen & { date: Date };

  const filteredListens = listens.filter((l) => l.date) as ListenWithDate[];

  return prisma.lastfmListen.createMany({
    data: filteredListens.map((l) => ({
      userId: user.id,
      listenedAt: l.date,
      trackName: l.track.name,
      artistName: l.track.artist.name,
      trackData: l.track,
    })),
  });
}

/**
 * Retrieves a Last.fm listen by its ID.
 *
 * @param {number} id - The ID of the Last.fm listen to retrieve.
 * @returns {Promise<LastfmListen>} A promise that resolves to the Last.fm listen with the specified ID.
 * @throws {Error} Will throw an error if no listen is found with the specified ID, or if no Last.fm account is found for the user who listened to the track.
 */
export async function getLastfmListenById(id: number): Promise<LastfmListen> {
  const prismaListen = await prisma.lastfmListen.findUnique({ where: { id } });
  if (!prismaListen) {
    throw new LastfmListenNotFoundError(`No listen found with id ${id}`);
  }

  const lastfmAccount = await prisma.lastfmAccount.findUnique({
    where: {
      userId: prismaListen.userId,
    },
  });
  if (!lastfmAccount) {
    throw new Error(
      `No lastfm account found for user with id ${prismaListen.userId}`,
    );
  }

  return {
    date: prismaListen.listenedAt,
    track: {
      name: prismaListen.trackName,
      mbid: (prismaListen.trackData as { mbid: string })?.mbid,
      url: (prismaListen.trackData as { url: string })?.url,
      artist: {
        name: prismaListen.artistName,
        mbid: (prismaListen.trackData as { artist: { mbid: string } })?.artist
          .mbid,
      },
      album: {
        name: (prismaListen.trackData as { album: { name: string } })?.album
          .name,
        mbid: (prismaListen.trackData as { album: { mbid: string } })?.album
          .mbid,
      },
    },
    isNowPlaying: false,
    lastfmAccount: {
      username: lastfmAccount.username,
      registeredAt: lastfmAccount.registeredAt,
      url: lastfmAccount.url,
      playCount: lastfmAccount.playCount,
      trackCount: lastfmAccount.trackCount,
    },
  };
}
