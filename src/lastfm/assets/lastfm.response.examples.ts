import {
  LastfmGetRecentTracksResponse,
  LastfmRecentTrackResponse,
} from "../lastfm.types";

const ARTIST_WITH_MBID = {
  mbid: "mbid-artist-123456789",
  "#text": "Test Artist with mbid",
};
const ARTIST_WITHOUT_MBID = {
  mbid: "",
  "#text": "Test Artist without mbid",
};
const ALBUM_WITH_MBID = {
  mbid: "mbid-album-123456789",
  "#text": "Test Album with mbid",
};
const ALBUM_WITHOUT_MBID = {
  mbid: "",
  "#text": "Test Album without mbid",
};
function createDate(number: number): LastfmRecentTrackResponse["date"] {
  return {
    uts: number.toString(),
    "#text": new Date(number).toString(),
  };
}

export const USER1 = {
  user: "test-atomicGravy",
  page: "1",
  perPage: "1",
  total: "1",
  totalPages: "1",
};
export const USER2 = {
  user: "test-mathwho",
  page: "1",
  perPage: "10",
  total: "110",
  totalPages: "11",
};

function createTestRecentTrackResponse(
  hasMbid: boolean,
  hasArtistMbid: boolean,
  hasAlbumMbid: boolean,
  isNowPlaying: boolean,
  date?: number
): LastfmRecentTrackResponse {
  return {
    mbid: hasMbid ? "mbid-track-123456789" : undefined,
    name: `Test Track ${hasMbid ? "with" : "without"} mbid`,
    url: "https://www.last.fm/music/Test+Artist/_/Test+Track",
    artist: hasArtistMbid ? ARTIST_WITH_MBID : ARTIST_WITHOUT_MBID,
    album: hasAlbumMbid ? ALBUM_WITH_MBID : ALBUM_WITHOUT_MBID,
    date: date ? createDate(date) : undefined,
    "@attr": isNowPlaying ? { nowplaying: "true" } : undefined,
  };
}
type TrackParams = Parameters<typeof createTestRecentTrackResponse>;

export function createGetRecentTracksResponse(
  userNumber: 1 | 2,
  tracksParams: TrackParams[]
): LastfmGetRecentTracksResponse {
  return {
    recenttracks: {
      track: tracksParams.map((params) =>
        createTestRecentTrackResponse(...params)
      ),
      "@attr": userNumber === 1 ? USER1 : USER2,
    },
  };
}
