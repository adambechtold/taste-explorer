import { LastFmUserInfoResponse, LastFmUser } from "./lastfm.types";

export function createLastFmUser(response: LastFmUserInfoResponse): LastFmUser {
  return {
    username: response.user.name,
    registeredTime: parseInt(response.user.registered.unixtime),
    url: response.user.url,
    playCount: parseInt(response.user.playcount),
    trackCount: parseInt(response.user.track_count),
  };
}
