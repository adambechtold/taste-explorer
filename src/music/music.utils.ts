import { LastFmListen } from "../lastfm/lastfm.types";
import { Listen } from "./music.types";

export function createListenFromLastFmListen(
  lastFmListen: LastFmListen
): Listen {
  return {
    date: lastFmListen.date,
    track: {
      name: lastFmListen.track.name,
      mbid: lastFmListen.track.mbid,
      url: lastFmListen.track.url,
      artist: {
        name: lastFmListen.track.artist.name,
        mbid: lastFmListen.track.artist.mbid,
      },
      album: {
        name: lastFmListen.track.album.name,
        mbid: lastFmListen.track.album.mbid,
      },
    },
  };
}
