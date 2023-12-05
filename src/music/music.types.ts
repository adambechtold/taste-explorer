import { UserWithId } from "../users/users.types";

export type Listen = {
  track: Track;
  user: UserWithId;
  listenedAt: Date;
};

export type Track = {
  name: string;
  mbid: string;
  url: string;
  album: Album;
  artists: Artist[];
  // streamable: "0" | "1"; // lastfm provides this but I don't understand it yet
  // images: Image[]; // lastfm provides this but I don't want to track it yet
};

export type Album = {
  name: string;
  mbid: string;
  artists: Artist[];
};

export type Artist = {
  name: string;
  mbid: string;
};

export type ListenHistoryUpdate = {
  status: "started" | "failed";
};

/*
export type Image = {
  size: "small" | "medium" | "large" | "extralarge";
  url: string;
};
*/
