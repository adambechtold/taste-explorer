import { LastfmAccount } from "../lastfm/lastfm.types";

export type User = {
  lastfmAccount?: LastfmAccount;
};

export type UserWithId = User & {
  id: number;
};
