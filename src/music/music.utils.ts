import { LastfmListen } from "../lastfm/lastfm.types";
import { Listen } from "./music.types";

export function createListenFromLastfmListen(
  lastfmListen: LastfmListen
): Listen {
  return {
    date: lastfmListen.date,
    track: {
      name: lastfmListen.track.name,
      mbid: lastfmListen.track.mbid,
      url: lastfmListen.track.url,
      artist: {
        name: lastfmListen.track.artist.name,
        mbid: lastfmListen.track.artist.mbid,
      },
      album: {
        name: lastfmListen.track.album.name,
        mbid: lastfmListen.track.album.mbid,
      },
    },
  };
}
