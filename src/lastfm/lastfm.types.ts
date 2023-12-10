import { EventEmitter } from "events";

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
    "@attr": LastfmAttrResponse;
  };
};

type LastfmAttrResponse = {
  user: string; // lastfm Username
  page: string; // Page Number
  perPage: string; // Number of songs per page
  total: string; // Total number of songs
  totalPages: string; // Total number of pages
};

export type LastfmRecentTrackResponse = {
  mbid?: string;
  name: string;
  url: string;
  artist: {
    mbid?: string;
    "#text": string; // name of artist
  };
  // streamable: "0" | "1"; // ignore this for now
  album: {
    mbid?: string;
    "#text": string; // name of album
  };
  date?: {
    uts: string;
    "#text": string; // date in a human readable format
  };
  "@attr"?: { nowplaying: "true" };
  // image: LastfmImageResponse[]; // ignore this
};

// - Intermediate Types -
export type LastfmListen = {
  track: LastfmTrack;
  date?: Date;
  isNowPlaying: boolean;
  lastfmAccount: LastfmAccount;
};

type LastfmTrack = {
  mbid?: string;
  name: string;
  url: string;
  artist: LastfmArtist;
  album: LastfmAlbum;
};

type LastfmAlbum = {
  mbid?: string;
  name: string;
};

type LastfmArtist = {
  mbid?: string;
  name: string;
};

export type LastfmListenBatchImportSize = {
  numberOfNewListensToImport: number;
};

// - Custom Event Emitters -
// TODO: Move this
export class LastfmListensEventEmitter extends EventEmitter {
  constructor() {
    super();
  }

  // --- Start ---
  emitStart(size: LastfmListenBatchImportSize) {
    this.emit("start", size);
  }

  onStart(callback: (size: LastfmListenBatchImportSize) => void) {
    this.on("start", callback);
  }

  // --- New Listens ---
  emitListens(listens: LastfmListen[]) {
    this.emit("listens", listens);
  }

  onListens(callback: (listens: LastfmListen[]) => void) {
    this.on("listens", callback);
  }

  // --- End ---
  emitEnd() {
    this.emit("end");
  }

  onEnd(callback: () => void) {
    this.on("end", callback);
  }

  // --- Error ---
  emitError(error: Error) {
    this.emit("error", error);
  }

  onError(callback: (error: Error) => void) {
    this.on("error", callback);
  }
}
