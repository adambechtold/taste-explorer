// import fs from "fs/promises";
import { TypedError } from "../errors/errors.types";
import { UserWithId } from "../users/users.types";

import { LastfmAccount } from "./lastfm.types";
import * as LastfmApi from "./lastfm.api";
import {
  createLastfmAccount,
  createLastfmListensFromRecentTracks,
} from "./lastfm.utils";
import { LastfmListensEventEmitter } from "../lastfm/lastfm.types";
import { storeListenBatch } from "./lastfm.storage";

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

export function updateUserListeningHistory(
  user: UserWithId
): LastfmListensEventEmitter {
  if (!user.lastfmAccount) {
    throw new TypedError(
      `Cannot trigger update listens for user without lastfm account.`,
      400
    );
  }

  const updateTracker = new LastfmListensEventEmitter();
  updateTracker.onListens((listens) => {
    console.log(`store ${listens.length} listens`);
    storeListenBatch(listens, user);
  });

  getAllListens(user.lastfmAccount, updateTracker);
  return updateTracker;
}

export async function getAllListens(
  lastfmAccount: LastfmAccount,
  updateTracker: LastfmListensEventEmitter
) {
  let pageNumber = 1;
  const pageSize = 1000; // TODO: Make this larger (1000)

  // TODO: Implement error handling

  // get one page of listens
  // Use information from the first response to determine how many pages to get
  const response = await LastfmApi.getRecentTracks(
    lastfmAccount.username,
    pageNumber,
    pageSize
  );

  const totalNumberOfPages = parseInt(
    response.recenttracks["@attr"].totalPages
  );

  // indicate that the service has started
  console.log("I'm going to emit start");
  updateTracker.emitStart({
    numberOfNewListensToImport: parseInt(response.recenttracks["@attr"].total),
  });

  // Return the first set of listens we captured
  const lastfmListens = createLastfmListensFromRecentTracks(
    response,
    lastfmAccount
  );
  updateTracker.emitListens(lastfmListens);

  //const MAX_PAGES = 1;
  const MAX_PAGES = totalNumberOfPages;
  for (let i = pageNumber + 1; i <= MAX_PAGES; i++) {
    console.log("find more listens");
    const response = await LastfmApi.getRecentTracks(
      lastfmAccount.username,
      i,
      pageSize
    );
    const lastfmListens = createLastfmListensFromRecentTracks(
      response,
      lastfmAccount
    );
    pageNumber = i + 1;

    updateTracker.emitListens(lastfmListens);
    //await new Promise((resolve) => setTimeout(resolve, 4000));
  }

  updateTracker.emitEnd();
  console.log("done getting listens");
}
