import {
  LastfmAccountInfoResponse,
  LastfmAccount,
  LastfmGetRecentTracksResponse,
  LastfmListen,
} from "./lastfm.types";
import { unixTimestampToDate } from "../utils/date.utils";

export function createLastfmAccount(
  response: LastfmAccountInfoResponse
): LastfmAccount {
  return {
    username: response.user.name,
    registeredAt: new Date(parseInt(response.user.registered.unixtime) * 1000),
    url: response.user.url,
    playCount: parseInt(response.user.playcount),
    trackCount: parseInt(response.user.track_count),
  };
}

/**
 * Transforms the response from the Last.fm API's "get recent tracks" endpoint into an array of LastfmListen objects.
 * It filters out tracks that are currently playing and tracks without dates.
 *
 * @param {LastfmGetRecentTracksResponse} response
 * @returns {LastfmListen[]}
 */
export function createLastfmListensFromRecentTracks(
  response: LastfmGetRecentTracksResponse,
  lastFmAccount: LastfmAccount
): LastfmListen[] {
  const tracks = response.recenttracks.track;

  return tracks.map((track) => ({
    date: track.date
      ? unixTimestampToDate(parseInt(track.date.uts))
      : undefined,
    isNowPlaying: track["@attr"]?.nowplaying === "true",
    track: {
      mbid: track.mbid,
      name: track.name,
      url: track.url,
      artist: {
        mbid: track.artist.mbid,
        name: track.artist["#text"],
      },
      album: {
        mbid: track.album.mbid,
        name: track.album["#text"],
      },
    },
    lastfmAccount: lastFmAccount,
  }));
}
