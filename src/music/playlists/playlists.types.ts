import { TrackWithId } from "../music.types";

export type PreferenceType = "USER1-ONLY" | "USER2-ONLY" | "BOTH";

export const isValidPreferenceType = (type: string): type is PreferenceType => {
  return type === "USER1-ONLY" || type === "USER2-ONLY" || type === "BOTH";
};

export type Playlist = {
  tracks: {
    items: TrackWithId[];
  };
};
