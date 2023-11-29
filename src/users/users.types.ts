import { LastFmAccount } from "../lastfm/lastfm.types";

export type User = {
  id: number;
  lastFmAccount?: LastFmAccount;
};
