export type Listen = {
  track: Track;
  date: Date; // UTS
};

export type Track = {
  name: string;
  mbid: string;
  url: string;
  album: Album;
  artist: Artist;
  // streamable: "0" | "1"; // lastfm provides this but I don't understand it yet
  // images: Image[]; // lastfm provides this but I don't want to track it yet
};

export type Album = {
  name: string;
  mbid: string;
};

export type Artist = {
  name: string;
  mbid: string;
};

export type ListenHistoryUpdate = {
  result: "success" | "error";
  newListensCount: number;
};

/*
export type Image = {
  size: "small" | "medium" | "large" | "extralarge";
  url: string;
};
*/
