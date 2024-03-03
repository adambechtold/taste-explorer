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
import { TypedError } from "../errors/errors.types";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getAccountInfo(
  lastfmUsername: string
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
      500
    );
  }
}

/**
 * Trigger an update of the user's listening history
 *
 * @param {UserWithLastfmAccountAndId} user - The user to update
 * @returns {Promise<LastfmListensEventEmitter>} - An event emitter that emits events as the update progresses
 */
export async function updateUserListeningHistory(
  user: UserWithLastfmAccountAndId
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
      dateToUnixTimestamp(lastListen.listenedAt) + 1
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
  from?: Date
) {
  const pageSize = 200;

  // TODO: Implement error handling (TE-6 (https://adam-bechtold.atlassian.net/browse/TE-6?atlOrigin=eyJpIjoiYTQ5NzdkNjE2M2U3NDA0ZThhNGU3YWJkMDk5MWMxZDMiLCJwIjoiaiJ9))

  // get one page of listens
  // Use information from the first response to determine how many pages to get
  const response = await LastfmApi.getRecentTracks(
    lastfmAccount.username,
    1,
    pageSize,
    from
  );

  const totalNumberOfPages = parseInt(
    response.recenttracks["@attr"].totalPages
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
      "we'll fetch pages " + lastPageNumber + " to " + firstPageNumber
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
      from
    );

    if (process.env.VERBOSE === "true") {
      console.log("......got ", response.recenttracks.track.length, " listens");
    }
    const lastfmListens = createLastfmListensFromRecentTracks(
      response,
      lastfmAccount
    );

    updateTracker.emitListens(lastfmListens);
  }

  updateTracker.emitEnd();
  if (process.env.VERBOSE === "true") {
    console.log("done getting listens");
  }
}
