import { UserWithLastfmAccountAndId } from "../users/users.types";

import { LastfmAccount } from "./lastfm.types";
import * as LastfmApi from "./lastfm.api";
import {
  createLastfmAccount,
  createLastfmListensFromRecentTracks,
} from "./lastfm.utils";
import { LastfmListensEventEmitter } from "../lastfm/lastfm.types";
import { storeListenBatch } from "./lastfm.storage";
import {
  dateToUnixTimestamp,
  unixTimestampToDate,
} from "../utils/datetime.utils";
import { LastfmListenNotFoundError, TypedError } from "../errors/errors.types";

import { Prisma, PrismaClient, LastfmListen } from "@prisma/client";
const prisma = new PrismaClient();

export async function getAccountInfo(
  lastfmUsername: string,
): Promise<LastfmAccount> {
  try {
    const lastfmResponse = await LastfmApi.getAccountInfo(lastfmUsername);
    const lastfmAccount = createLastfmAccount(lastfmResponse);

    return lastfmAccount;
  } catch (e) {
    if (e instanceof TypedError) {
      throw e;
    }
    console.error(e);
    throw TypedError.create(
      `Could not create user for lastfm username: ${lastfmUsername}`,
      500,
    );
  }
}

/**
 * Get a LastfmAccount by its id
 * @param {number} id - The id of the LastfmAccount to get
 * @returns {Promise<LastfmAccount>} - A promise that resolves to the LastfmAccount
 * @throws {LastfmAccountNotFoundError} - Throws an error if the LastfmAccount is not found
 */
export async function getLastfmListenById(id: number): Promise<LastfmListen> {
  const listen = await prisma.lastfmListen.findUnique({ where: { id } });
  if (!listen) {
    throw new LastfmListenNotFoundError(`Could not find listen with id: ${id}`);
  }
  return listen;
}

/**
 * Trigger an update of the user's listening history
 *
 * @param {UserWithLastfmAccountAndId} user - The user to update
 * @returns {Promise<LastfmListensEventEmitter>} - An event emitter that emits events as the update progresses
 */
export async function updateUserListeningHistory(
  user: UserWithLastfmAccountAndId,
): Promise<LastfmListensEventEmitter> {
  const updateTracker = new LastfmListensEventEmitter();
  updateTracker.onListens((listens) => {
    if (process.env.VERBOSE === "true") {
      console.log(`......store ${listens.length} listens`);
    }
    storeListenBatch(listens, user);
  });

  // get most recent listen
  const lastListen = await prisma.lastfmListen.findFirst({
    where: {
      userId: user.id,
    },
    orderBy: {
      listenedAt: "desc",
    },
  });

  if (lastListen) {
    if (process.env.VERBOSE === "true") {
      console.log("last listen was at", lastListen.listenedAt);
    }
    const findTracksFrom = unixTimestampToDate(
      dateToUnixTimestamp(lastListen.listenedAt) + 1,
    );
    getAllListens(user.lastfmAccount, updateTracker, findTracksFrom);
    return updateTracker;
  }

  getAllListens(user.lastfmAccount, updateTracker);
  return updateTracker;
}

/**
 * Fetches all listens for the given lastfm account that have not been previously fetched.
 *
 * @param {LastfmAccount} lastfmAccount  - The lastfm account to fetch listens for
 * @param {LastfmListensEventEmitter} updateTracker - An event emitter that emits events as the update progresses
 * @param {Date?} from - The date to start fetching listens from. (Default: undefined)
 *
 * @returns {Promise<void>} - A promise that resolves when all listens have been fetched.
 */
export async function getAllListens(
  lastfmAccount: LastfmAccount,
  updateTracker: LastfmListensEventEmitter,
  from?: Date,
): Promise<void> {
  const pageSize = 200;

  // TODO: Implement error handling (TE-6 (https://adam-bechtold.atlassian.net/browse/TE-6?atlOrigin=eyJpIjoiYTQ5NzdkNjE2M2U3NDA0ZThhNGU3YWJkMDk5MWMxZDMiLCJwIjoiaiJ9))

  // get one page of listens
  // Use information from the first response to determine how many pages to get
  const response = await LastfmApi.getRecentTracks(
    lastfmAccount.username,
    1,
    pageSize,
    from,
  );

  const totalNumberOfPages = parseInt(
    response.recenttracks["@attr"].totalPages,
  );

  // indicate that the service has started
  updateTracker.emitStart({
    numberOfNewListensToImport: parseInt(response.recenttracks["@attr"].total),
  });

  const maximumNumberOfPagesToFetch = Infinity;
  const firstPageNumber = totalNumberOfPages;
  const lastPageNumber =
    totalNumberOfPages - (maximumNumberOfPagesToFetch - 1) > 1
      ? totalNumberOfPages - (maximumNumberOfPagesToFetch - 1)
      : 1;
  if (process.env.VERBOSE === "true") {
    console.log(
      "we'll fetch pages " + lastPageNumber + " to " + firstPageNumber,
    );
  }

  for (let i = firstPageNumber; i >= lastPageNumber; i--) {
    if (process.env.VERBOSE === "true") {
      console.log("...retrieving page " + i + " of " + totalNumberOfPages);
    }

    const response = await LastfmApi.getRecentTracks(
      lastfmAccount.username,
      i,
      pageSize,
      from,
    );

    if (process.env.VERBOSE === "true") {
      console.log("......got ", response.recenttracks.track.length, " listens");
    }
    const lastfmListens = createLastfmListensFromRecentTracks(
      response,
      lastfmAccount,
    );

    updateTracker.emitListens(lastfmListens);
  }

  updateTracker.emitEnd();
  if (process.env.VERBOSE === "true") {
    console.log("done getting listens");
  }
}

/**
 * Marks all LastfmListens that match the given where clause as analyzed.
 * @param {Prisma.LastfmListenWhereInput} where - The where clause to match LastfmListens against.
 * @returns {Promise<Prisma.BatchPayload>} - A promise that resolves to the number of LastfmListens marked as analyzed.
 * @throws {Error} - Throws an error if the query fails.
 */
export async function markLastfmListensAsAnalyzed(
  where: Prisma.LastfmListenWhereInput,
): Promise<Prisma.BatchPayload> {
  return await prisma.lastfmListen.updateMany({
    where,
    data: { analyzedAt: new Date() },
  });
}

/**
 * Creates Listens to link each of the LastfmListens
 * that have the same trackName and artistName to the given Track id
 *
 * @param {number} trackId - The id of the track to link the listens to.
 * @param {string} trackName - The name of the track to search for.
 * @param {string} artistName - The name of the artist of the track to search for.
 * @param {boolean} overwrite - Whether to overwrite lastfm listens that are already linked to a track. (Default: false)
 * @returns {Promise<Prisma.BatchPayload>} - A promise that resolves to the number of listens linked.
 */
export async function linkTrackIdToAllLastfmListensWithTrackNameAndArtistName(args: {
  trackId: number;
  trackName: string;
  artistName: string;
  overwrite: boolean;
}): Promise<Prisma.BatchPayload> {
  const { trackId, trackName, artistName, overwrite } = args;

  const matchingLastfmListensNotAnalyzed = await prisma.lastfmListen.findMany({
    select: {
      id: true,
      listenedAt: true,
      userId: true,
    },
    where: {
      trackName,
      artistName,
      analyzedAt: null,
    },
  });
  // create listens for each lastfm listen
  const [result, _markAsAnalyzedResult] = await prisma.$transaction([
    prisma.listen.createMany({
      data: matchingLastfmListensNotAnalyzed.map((lastfmListen) => ({
        trackId,
        userId: lastfmListen.userId,
        lastfmListenId: lastfmListen.id,
        listenedAt: lastfmListen.listenedAt,
      })),
    }),
    prisma.lastfmListen.updateMany({
      where: {
        id: {
          in: matchingLastfmListensNotAnalyzed.map(
            (lastfmListen) => lastfmListen.id,
          ),
        },
      },
      data: {
        analyzedAt: new Date(),
      },
    }),
  ]);

  if (overwrite) {
    // overwrite listens that have already been analyzed
    let previouslyAnalyzedLastfmListens = await prisma.lastfmListen.findMany({
      select: {
        id: true,
      },
      where: {
        trackName,
        artistName,
        analyzedAt: {
          not: null,
        },
        id: {
          not: {
            in: matchingLastfmListensNotAnalyzed.map((l) => l.id), // don't include the listens that were just analyzed
          },
        },
      },
    });

    const [overwriteListensResult, _updateAnalyzedTimeResult] =
      await prisma.$transaction([
        prisma.listen.updateMany({
          where: {
            lastfmListenId: {
              in: previouslyAnalyzedLastfmListens.map((l) => l.id),
            },
          },
          data: {
            trackId,
          },
        }),
        prisma.lastfmListen.updateMany({
          where: {
            id: {
              in: previouslyAnalyzedLastfmListens.map((l) => l.id),
            },
          },
          data: {
            analyzedAt: new Date(),
          },
        }),
      ]);

    result.count = result.count + overwriteListensResult.count;
  }

  return result;
}
