import { User, UserWithId } from "../../users/users.types";
import { Album, Artist, Listen, Track } from "../music.types";

const ARTIST1: Artist = {
  name: "Example Artist",
  mbid: "example-artist-mbid",
};
const ARTIST2: Artist = {
  name: "Example Artist2",
  mbid: "example-artist-mbid-2",
};

const ALBUM_ART1_1: Album = {
  name: "Example Album",
  mbid: "example-album-mbid",
  artists: [ARTIST1],
};
const ALBUM_ART1_2: Album = {
  name: "Example Album2",
  mbid: "example-album-mbid-2",
  artists: [ARTIST1],
};
const ALBUM_ART2_1: Album = {
  name: "Example Album3",
  mbid: "example-album-mbid-3",
  artists: [ARTIST2],
};

export const USER1: User = {
  lastfmAccount: {
    username: "example-username",
    registeredAt: new Date(0),
    url: "https://www.last.fm/user/example-username",
    playCount: 1000,
    trackCount: 10,
  },
};
export const USER2: User = {
  lastfmAccount: {
    username: "example-username-2",
    registeredAt: new Date(0),
    url: "https://www.last.fm/user/example-username-2",
    playCount: 1000,
    trackCount: 10,
  },
};

export const TRACK1_ART1_ALB1_1: Track = {
  name: "Example Track",
  mbid: "example-mbid",
  url: "https://www.last.fm/music/Example+Artist/_/Example+Track",
  artists: [ARTIST1],
  album: ALBUM_ART1_1,
};
export const TRACK2_ART1_ALB1_2: Track = {
  name: "Example Track2",
  mbid: "example-mbid-2",
  url: "https://www.last.fm/music/Example+Artist2/_/Example+Track2",
  artists: [ARTIST1],
  album: ALBUM_ART1_1,
};
export const TRACK3_ART2_ALB1_1: Track = {
  name: "Example Track3",
  mbid: "example-mbid-3",
  url: "https://www.last.fm/music/Example+Artist2/_/Example+Track3",
  artists: [ARTIST2],
  album: ALBUM_ART2_1,
};
export const TRACK4_ART2_ALB2_1: Track = {
  name: "Example Track4",
  mbid: "example-mbid-4",
  url: "https://www.last.fm/music/Example+Artist2/_/Example+Track4",
  artists: [ARTIST2],
  album: ALBUM_ART2_1,
};

export const getListen = (
  user: UserWithId,
  track: Track,
  listenedAt: Date
): Listen => ({
  listenedAt: listenedAt,
  track,
  user,
});
