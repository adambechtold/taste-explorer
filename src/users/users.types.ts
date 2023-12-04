import { lastfmAccount } from "../lastfm/lastfm.types";

export type User = {
  id: number;
  lastfmAccount?: lastfmAccount;
};
