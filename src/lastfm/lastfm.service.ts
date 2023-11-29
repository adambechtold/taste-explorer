import fs from "fs/promises";
import { LastFmAccount, LastFmAccountInfoResponse } from "./lastfm.types";
import { createLastFmAccount } from "./lastfm.utils";

const EXAMPLE_USER_FILENAME = __dirname + "/../data/userinfo-atomicGravy.json";

export async function getAccountInfo(
  lastFmUsername: string
): Promise<LastFmAccount> {
  if (!lastFmUsername) {
    throw new Error("Missing LastFM Username");
  }
  if (lastFmUsername !== "atomicGravy") {
    throw new Error(
      "Can only create users from atomicGravy. Other users not supported."
    );
  }

  try {
    // get user info from lastfm
    const data = await fs.readFile(EXAMPLE_USER_FILENAME);
    const lastFmResponse: LastFmAccountInfoResponse = JSON.parse(
      data.toString()
    );
    const lastFmAccount = createLastFmAccount(lastFmResponse);

    return lastFmAccount;
  } catch (e) {
    console.error(e);
    throw new Error(
      `Could not create user for lastfm username: ${lastFmUsername}`
    );
  }
}
