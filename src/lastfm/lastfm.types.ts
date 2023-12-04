// This is only a partial response. See the example response under /data/
export type LastFmAccountInfoResponse = {
  user: {
    name: string;
    registered: {
      unixtime: string;
    };
    url: string;
    playcount: string;
    track_count: string;
  };
};

export type LastFmAccount = {
  username: string;
  registeredAt: Date;
  url: string;
  playCount: number;
  trackCount: number;
};

// --- Get Recent Tracks ---
// - Response Structure
export type LastFmGetRecentTracksResponse = {
  recenttracks: {
    track: LastFmRecentTrackResponse[];
  };
};

export type LastFmRecentTrackResponse = {
  mbid: string;
  name: string;
  url: string;
  artist: {
    mbid: string;
    "#text": string; // name of artist
  };
  streamable: "0" | "1"; // ignore this for now
  album: {
    mbid: string;
    "#text": string; // name of album
  };
  date: {
    uts: string;
    "#text": string; // date in a human readable format
  };
  image: LastFmImageResponse[]; // ignore this for now
  "@attr"?: { nowplaying: "true" };
};

type LastFmImageResponse = {
  sizes: "small" | "medium" | "large" | "extralarge";
  "#text": string; // url
};

// - Intermediate Types -
type LastFmTrack = Pick<LastFmRecentTrackResponse, "mbid" | "name" | "url"> & {
  artist: LastFmArtist;
  album: LastFmAlbum;
};

export type LastFmListen = {
  track: LastFmTrack;
  date: Date;
};

type LastFmAlbum = {
  mbid: string;
  name: string;
};

type LastFmArtist = {
  mbid: string;
  name: string;
};
