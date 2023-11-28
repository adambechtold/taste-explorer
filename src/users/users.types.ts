import { LastFmUser } from "../lastfm/lastfm.types";

export type User = {
  id: number;
  lastfm: LastFmUser;
};
