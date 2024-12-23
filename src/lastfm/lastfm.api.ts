import { TypedError } from "../errors/errors.types";
import { dateToUnixTimestamp } from "../utils/datetime.utils";
import {
  LastfmAccountInfoResponse,
  LastfmGetRecentTracksResponse,
} from "./lastfm.types";

const LAST_FM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";

const LASTFM_API_KEY = process.env.LASTFM_API_KEY || "";
if (!LASTFM_API_KEY) {
  console.warn("Missing LASTFM_API_KEY. Many features will not be available.");
}

/**
 * Wrapper around the getAccountInfo API call to last.fm
 * @param username - the username to get account info for
 * @returns - the response from last.fm
 **/
export async function getAccountInfo(
  lastfmUsername: string,
): Promise<LastfmAccountInfoResponse> {
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
      );
    }

    if (response.status !== 200) {
      console.error(
        `Response code ${response.status} from lastfm:`,
        await response.json(),
      );
      throw new TypedError(
        `Could not get account info for user: ${lastfmUsername}`,
        500,
      );
    }

    return (await response.json()) as LastfmAccountInfoResponse;
  } catch (e: any) {
    if (e instanceof TypedError) {
      throw e;
    }
    console.error(e);
    throw new TypedError(
      `Failed to get account info for user: ${lastfmUsername}`,
      500,
    );
  }
}

/* Wrapper around the getRecentTracks API call to last.fm
 * @param username - the username to get recent tracks for
 * @param pageNumber - the page number to get
 * @param limit - the number of tracks to get per page
 * @returns - the response from last.fm
 **/
export async function getRecentTracks(
  username: string,
  pageNumber: number = 1,
  limit: number = 200,
  from?: Date,
  attempts: number = 0,
): Promise<LastfmGetRecentTracksResponse> {
  if (process.env.VERBOSE === "true") {
    console.log("getting recent tracks from lastfm");
    console.log("username: ", username);
    console.log("from: ", from);
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

  if (from) {
    params.append("from", dateToUnixTimestamp(from).toString());
  }

  const url = new URL(LAST_FM_BASE_URL);
  url.search = params.toString();

  if (process.env.VERBOSE === "true") {
    console.log("url: ", url.toString());
  }

  try {
    if (process.env.VERBOSE === "true") {
      console.log("\n\ngetting recent tracks from lastfm");
      console.log("url: ", url.toString());
    }
    const response = await fetch(url.toString());

    if (response.status !== 200) {
      console.error(`Response code ${response.status} from lastfm:`);
      console.dir(await response.json(), { depth: null });

      if (response.status === 500 && attempts < 3) {
        console.log("retrying...");
        return getRecentTracks(username, pageNumber, limit, from, attempts + 1);
      }

      if (response.status === 429) {
        throw TypedError.create("Too many requests to last.fm", 429);
      }

      throw new Error(
        `Response code ${response.status} from lastfm: ${await response.json()}`,
      );
    }

    const data = (await response.json()) as LastfmGetRecentTracksResponse;

    if (process.env.VERBOSE === "true") {
      console.log("\n\nresponse from last.fm\n\n");
      console.dir(data, { depth: null });
    }
    return data;
  } catch (e) {
    console.error(e);
    throw new Error(`Could not get recent tracks for user: ${username}`);
  }
}
