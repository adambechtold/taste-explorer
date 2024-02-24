import { TrackWithId } from "../music.types";

export type PreferenceType = "USER1-ONLY" | "USER2-ONLY" | "BOTH";

export const isValidPreferenceType = (type: string): type is PreferenceType => {
  return type === "USER1-ONLY" || type === "USER2-ONLY" || type === "BOTH";
};

export const reversePreferenceType = (type: string): PreferenceType => {
  switch (type) {
    case "USER1-ONLY":
      return "USER2-ONLY";
    case "USER2-ONLY":
      return "USER1-ONLY";
    default:
      return "BOTH";
  }
};

export type Playlist = {
  tracks: {
    items: TrackWithId[];
  };
};
