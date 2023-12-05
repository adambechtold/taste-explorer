import { UserWithId } from "../users/users.types";
import { LastfmListen } from "../lastfm/lastfm.types";
import { Listen } from "./music.types";

export function createListenFromLastfmListen(
  lastfmListen: LastfmListen,
  user: UserWithId
): Listen {
  if (!lastfmListen.track.mbid) {
    throw new Error(
      "Cannot create Listen from LastfmListen without track mbid"
    );
  }

  return {
    listenedAt: lastfmListen.date,
    track: {
      name: lastfmListen.track.name,
      mbid: lastfmListen.track.mbid,
      url: lastfmListen.track.url,
      artists: [
        {
          name: lastfmListen.track.artist.name,
          mbid: lastfmListen.track.artist.mbid,
        },
      ],
      album: {
        name: lastfmListen.track.album.name,
        mbid: lastfmListen.track.album.mbid,
        artists: [
          {
            mbid: lastfmListen.track.artist.mbid,
            name: lastfmListen.track.artist.name,
          },
        ],
      },
    },
    user,
  };
}
