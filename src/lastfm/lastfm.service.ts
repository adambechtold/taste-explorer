// import fs from "fs/promises";
import {
  LastfmAccount,
  LastfmAccountInfoResponse,
  LastfmListen,
  LastfmGetRecentTracksResponse,
} from "./lastfm.types";
import { TypedError } from "../errors/errors.types";
import {
  createLastfmAccount,
  createLastfmListensFromRecentTracks,
} from "./lastfm.utils";
import { dateToUnixTimestamp } from "../utils/date.utils";

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
        404,
        "NOT_FOUND"
      );
    }

    if (response.status !== 200) {
      console.error(
        `Response code ${response.status} from lastfm:`,
        await response.json()
      );
      throw new TypedError(
        `Could not get account info for user: ${lastfmUsername}`,
        500,
        "INTERNAL_SERVER_ERROR"
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

export async function getRecentTracks(
  username: string,
  from?: Date,
  to?: Date,
  limit?: number,
  page?: number
): Promise<LastfmListen[]> {
  if (process.env.VERBOSE) {
    console.log("getting recent tracks from lastfm");
    console.log("username: ", username);
    console.log("from: ", from);
    console.log("to: ", to);
    console.log("limit: ", limit);
    console.log("page: ", page);
  }

  // Create Params
  const params = new URLSearchParams({
    method: "user.getrecenttracks",
    user: username,
    api_key: LASTFM_API_KEY,
    format: "json",
    page: page?.toString() || "1",
    limit: limit?.toString() || "30",
  });
  if (from) {
    params.append("from", dateToUnixTimestamp(from).toString());
  }
  if (to) {
    params.append("to", dateToUnixTimestamp(to).toString());
  }

  const url = new URL(LAST_FM_BASE_URL);
  url.search = params.toString();

  try {
    if (process.env.VERBOSE) {
      console.log("\n\ngetting recent tracks from lastfm");
      console.log("url: ", url.toString());
    }
    const response = await fetch(url.toString());

    if (response.status !== 200) {
      console.error(
        `Response code ${response.status} from lastfm:`,
        await response.json()
      );
      throw new Error(`Could not get recent tracks for user: ${username}`);
    }

    const data = (await response.json()) as LastfmGetRecentTracksResponse;

    if (process.env.VERBOSE) {
      console.log("\n\nresponse from last.fm\n\n");
      console.dir(data, { depth: null });
    }

    const lastfmListens = createLastfmListensFromRecentTracks(data);
    return lastfmListens;
  } catch (e) {
    console.error(e);
    throw new Error(`Could not get recent tracks for user: ${username}`);
  }
}
