import { LastfmAccount } from "../lastfm/lastfm.types";

export type User = {
  id: number;
  lastfmAccount?: LastfmAccount;
};
