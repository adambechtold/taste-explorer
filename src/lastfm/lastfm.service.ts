// import fs from "fs/promises";
import {
  LastfmAccount,
  LastfmAccountInfoResponse,
  LastfmGetRecentTracksResponse,
} from "./lastfm.types";
import { TypedError } from "../errors/errors.types";
import {
  createLastfmAccount,
  createLastfmListensFromRecentTracks,
} from "./lastfm.utils";
import { LastfmListensEventEmitter } from "../lastfm/lastfm.types";

const LASTFM_API_KEY = process.env.LASTFM_API_KEY || "";
if (!LASTFM_API_KEY) {
  console.warn("Missing LASTFM_API_KEY. Many features will not be available.");
}

const LAST_FM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";

export async function getAccountInfo(
  lastfmUsername: string
): Promise<LastfmAccount> {
  try {
    // get user info from lastfm
    const params = new URLSearchParams({
      method: "user.getinfo",
      user: lastfmUsername,
      api_key: LASTFM_API_KEY,
      format: "json",
    });

    const url = new URL(LAST_FM_BASE_URL);
    url.search = params.toString();

    const response = await fetch(url.toString());

    if (response.status === 404) {
      throw new TypedError(
        `User: ${lastfmUsername} not found in last.fm.`,
        404
      );
    }

    if (response.status !== 200) {
      console.error(
        `Response code ${response.status} from lastfm:`,
        await response.json()
      );
      throw new TypedError(
        `Could not get account info for user: ${lastfmUsername}`,
        500
      );
    }

    const lastfmResponse = (await response.json()) as LastfmAccountInfoResponse;
    const lastfmAccount = createLastfmAccount(lastfmResponse);

    return lastfmAccount;
  } catch (e) {
    console.error(e);
    throw new Error(
      `Could not create user for lastfm username: ${lastfmUsername}`
    );
  }
}

export async function getAllListens(
  lastfmUsername: string,
  updateTracker: LastfmListensEventEmitter
): Promise<boolean> {
  let pageNumber = 1;
  const pageSize = 1000; // TODO: Make this larger

  // get one page of listens
  const response = await getRecentTracks(lastfmUsername, pageNumber, pageSize);
  updateTracker.emitStart();

  const totalNumberOfPages = parseInt(
    response.recenttracks["@attr"].totalPages
  );
  const currentPage = response.recenttracks["@attr"].page;
  const numberOfListens = response.recenttracks["@attr"].total;
  console.log("Starting import:");
  console.dir({
    totalNumberOfPages,
    currentPage,
    numberOfListens,
  });

  const lastfmListens = createLastfmListensFromRecentTracks(response);
  updateTracker.emitListens(lastfmListens);

  const MAX_PAGES = totalNumberOfPages; // TODO: Remove this limit and make it the totalNumberOfPages
  for (let i = pageNumber + 1; i <= MAX_PAGES; i++) {
    const response = await getRecentTracks(
      lastfmUsername,
      pageNumber,
      pageSize
    );
    const lastfmListens = createLastfmListensFromRecentTracks(response);
    pageNumber = i + 1;

    updateTracker.emitListens(lastfmListens);
    //await new Promise((resolve) => setTimeout(resolve, 4000));
  }

  updateTracker.emitEnd();
  console.log("import complete");

  return true;
}

export async function getRecentTracks(
  username: string,
  pageNumber: number = 1,
  limit: number = 200
  // from?: Date
): Promise<LastfmGetRecentTracksResponse> {
  if (process.env.VERBOSE === "true") {
    console.log("getting recent tracks from lastfm");
    console.log("username: ", username);
    //    console.log("from: ", from);
  }

  // Create Params
  const params = new URLSearchParams({
    method: "user.getrecenttracks",
    user: username,
    api_key: LASTFM_API_KEY,
    format: "json",
    page: pageNumber.toString(),
    limit: limit.toString(),
  });
  //  if (from) {
  //    params.append("from", dateToUnixTimestamp(from).toString());
  //  }

  const url = new URL(LAST_FM_BASE_URL);
  url.search = params.toString();

  try {
    if (process.env.VERBOSE === "true") {
      console.log("\n\ngetting recent tracks from lastfm");
      console.log("url: ", url.toString());
    }
    const response = await fetch(url.toString());

    if (response.status !== 200) {
      console.error(
        `Response code ${response.status} from lastfm:`,
        await response.json()
      );
      throw new TypedError(
        `Could not get recent tracks for user: ${username}`,
        500
      );
    }

    const data = (await response.json()) as LastfmGetRecentTracksResponse;

    if (process.env.VERBOSE === "true") {
      console.log("\n\nresponse from last.fm\n\n");
      console.dir(data, { depth: null });
    }
    return data;

    //    const lastfmListens = createLastfmListensFromRecentTracks(data);
    //    return lastfmListens;
  } catch (e) {
    console.error(e);
    throw new Error(`Could not get recent tracks for user: ${username}`);
  }
}
