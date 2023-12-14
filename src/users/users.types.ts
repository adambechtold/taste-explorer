import { LastfmAccount } from "../lastfm/lastfm.types";

export type User = {
  id?: number;
  lastfmAccount?: LastfmAccount;
};

export type UserWithId = Required<Pick<User, "id">> & User;

export type UserWithLastfmAccountAndId = Required<Pick<User, "lastfmAccount">> &
  UserWithId;
