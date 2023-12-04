// This is only a partial response. See the example response under /data/
export type LastfmAccountInfoResponse = {
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

export type LastfmAccount = {
  username: string;
  registeredAt: Date;
  url: string;
  playCount: number;
  trackCount: number;
};

// --- Get Recent Tracks ---
// - Response Structure
export type LastfmGetRecentTracksResponse = {
  recenttracks: {
    track: LastfmRecentTrackResponse[];
  };
};

export type LastfmRecentTrackResponse = {
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
  image: LastfmImageResponse[]; // ignore this for now
  "@attr"?: { nowplaying: "true" };
};

type LastfmImageResponse = {
  sizes: "small" | "medium" | "large" | "extralarge";
  "#text": string; // url
};

// - Intermediate Types -
type LastfmTrack = Pick<LastfmRecentTrackResponse, "mbid" | "name" | "url"> & {
  artist: LastfmArtist;
  album: LastfmAlbum;
};

export type LastfmListen = {
  track: LastfmTrack;
  date: Date;
};

type LastfmAlbum = {
  mbid: string;
  name: string;
};

type LastfmArtist = {
  mbid: string;
  name: string;
};
