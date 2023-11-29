// This is only a partial response. See the example response under /data/
export type LastFmUserInfoResponse = {
  user: {
    name: string;
    registered: {
      unixtime: string;
    };
    url: string;
    playcount: string;
    track_count: string;
  };
};

export type LastFmUser = {
  username: string;
  registeredTime: number; // unix time
  url: string;
  playCount: number;
  trackCount: number;
};
