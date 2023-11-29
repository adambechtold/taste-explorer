// import fs from "fs/promises";
import { LastFmAccount, LastFmAccountInfoResponse } from "./lastfm.types";
import { createLastFmAccount } from "./lastfm.utils";

const LAST_FM_API_KEY = process.env.LAST_FM_API_KEY;
const LAST_FM_BASE_URL = "http://ws.audioscrobbler.com/2.0/";

export async function getAccountInfo(
  lastFmUsername: string
): Promise<LastFmAccount> {
  if (!lastFmUsername) {
    throw new Error("Missing LastFM Username");
  }

  try {
    // get user info from lastfm
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

    const data = (await response.json()) as LastFmAccountInfoResponse;

    const lastFmResponse: LastFmAccountInfoResponse = data;
    const lastFmAccount = createLastFmAccount(lastFmResponse);

    return lastFmAccount;
  } catch (e) {
    console.error(e);
    throw new Error(
      `Could not create user for lastfm username: ${lastFmUsername}`
    );
  }
}
