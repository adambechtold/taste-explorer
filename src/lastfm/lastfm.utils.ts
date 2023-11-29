import { LastFmAccountInfoResponse, LastFmAccount } from "./lastfm.types";

export function createLastFmAccount(
  response: LastFmAccountInfoResponse
): LastFmAccount {
  return {
    username: response.user.name,
    registeredTime: new Date(
      parseInt(response.user.registered.unixtime) * 1000
    ),
    url: response.user.url,
    playCount: parseInt(response.user.playcount),
    trackCount: parseInt(response.user.track_count),
  };
}
