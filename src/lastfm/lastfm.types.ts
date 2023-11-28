// This is only a partial response. See the example response under /data/
export type LastFmUserInfoResponse = {
  user: {
    name: string;
    registered: {
      unixtime: string;
    };
    url: string;
  };
};

export type LastFmUser = {
  username: string;
  registeredTime: number; // unix time
  url: string;
};
