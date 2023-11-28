import { LastFmUserInfoResponse } from "../lastfm/lastfm.types";
import { createLastFmUser } from "../lastfm/lastfm.utils";
import { User } from "./users.types";

import fs from "fs/promises";
const EXAMPLE_USER_FILENAME = __dirname + "/../data/userinfo-atomicGravy.json";

/*
 * Service Methods
 */

export async function testEndpoint(): Promise<string> {
  return "Users Service is Online";
}

export async function retrieveUserInfo(): Promise<User> {
  try {
    const data = await fs.readFile(EXAMPLE_USER_FILENAME);
    const lastFmResponse: LastFmUserInfoResponse = JSON.parse(data.toString());
    const lastFmUser = createLastFmUser(lastFmResponse);

    let user: User = {
      id: 1,
      lastfm: lastFmUser,
    };

    return user;
  } catch (error: any) {
    console.error("we got an error", error);
    throw new Error("User Not Found");
  }
}
