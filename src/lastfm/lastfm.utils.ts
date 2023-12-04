import {
  lastfmAccountInfoResponse,
  lastfmAccount,
  lastfmGetRecentTracksResponse,
  lastfmListen,
  lastfmRecentTrackResponse,
} from "./lastfm.types";
import { unixTimestampToDate } from "../utils/date.utils";

export function createLastfmAccount(
  response: lastfmAccountInfoResponse
): lastfmAccount {
  return {
    username: response.user.name,
    registeredAt: new Date(parseInt(response.user.registered.unixtime) * 1000),
    url: response.user.url,
    playCount: parseInt(response.user.playcount),
    trackCount: parseInt(response.user.track_count),
  };
}

export function createLastfmListensFromRecentTracks(
  response: lastfmGetRecentTracksResponse
): lastfmListen[] {
  const tracks = response.recenttracks.track;

  // remove now playing tracks and tracks without dates
  const filteredTracks = tracks.filter((track) => {
    const hasRequiredFields =
      track.date && track.mbid && track.artist.mbid && track.mbid;
    if (!hasRequiredFields) {
      console.warn(
        "Removing track because it does not have required fields",
        track
      );
    }
    return hasRequiredFields;
  });

  return filteredTracks.map((track) => {
    return {
      date: unixTimestampToDate(parseInt(track.date.uts)),
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
    };
  });
}
