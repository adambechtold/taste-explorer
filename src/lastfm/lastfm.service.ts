// import fs from "fs/promises";
import {
  LastFmAccount,
  LastFmAccountInfoResponse,
  LastFmListen,
  LastFmGetRecentTracksResponse,
} from "./lastfm.types";
import {
  createLastFmAccount,
  createLastFmListensFromRecentTracks,
} from "./lastfm.utils";
import { dateToUnixTimestamp } from "../utils/date.utils";

const LAST_FM_API_KEY = process.env.LAST_FM_API_KEY || "";
if (!LAST_FM_API_KEY) {
  console.warn("Missing LAST_FM_API_KEY. Many features will not be available.");
}

const LAST_FM_BASE_URL = "http://ws.audioscrobbler.com/2.0/";

export async function getAccountInfo(
  lastFmUsername: string
): Promise<LastFmAccount> {
  if (!lastFmUsername) {
    throw new Error("Missing LastFM Username");
  }

  try {
    // get user info from lastfm
    // TODO: Update this to use the URLSearchParams structure
    const response = await fetch(
      `${LAST_FM_BASE_URL}?method=user.getinfo&user=${lastFmUsername}&api_key=${LAST_FM_API_KEY}&format=json`
    );

    if (response.status !== 200) {
      console.error(
        `Response code ${response.status} from lastfm:`,
        await response.json()
      );
      throw new Error(
        `Could not create user for lastfm username: ${lastFmUsername}`
      );
    }

    const lastFmResponse = (await response.json()) as LastFmAccountInfoResponse;
    const lastFmAccount = createLastFmAccount(lastFmResponse);

    return lastFmAccount;
  } catch (e) {
    console.error(e);
    throw new Error(
      `Could not create user for lastfm username: ${lastFmUsername}`
    );
  }
}

export async function getRecentTracks(
  username: string,
  from?: Date,
  to?: Date,
  limit?: number,
  page?: number
): Promise<LastFmListen[]> {
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
    api_key: LAST_FM_API_KEY,
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

    const data = (await response.json()) as LastFmGetRecentTracksResponse;

    if (process.env.VERBOSE) {
      console.log("\n\nresponse from last.fm\n\n");
      console.dir(data, { depth: null });
    }

    const lastFmListens = createLastFmListensFromRecentTracks(data);
    return lastFmListens;
  } catch (e) {
    console.error(e);
    throw new Error(`Could not get recent tracks for user: ${username}`);
  }
}
