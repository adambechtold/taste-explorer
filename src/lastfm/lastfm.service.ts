import { UserWithLastfmAccountAndId } from "../users/users.types";

import { LastfmAccount } from "./lastfm.types";
import * as LastfmApi from "./lastfm.api";
import {
  createLastfmAccount,
  createLastfmListensFromRecentTracks,
} from "./lastfm.utils";
import { LastfmListensEventEmitter } from "../lastfm/lastfm.types";
import { storeListenBatch } from "./lastfm.storage";
import { dateToUnixTimestamp, unixTimestampToDate } from "../utils/date.utils";

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
    console.error(e);
    throw new Error(
      `Could not create user for lastfm username: ${lastfmUsername}`
    );
  }
}

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

export async function getAllListens(
  lastfmAccount: LastfmAccount,
  updateTracker: LastfmListensEventEmitter,
  from?: Date
) {
  const pageSize = 200;

  // TODO: Implement error handling

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
