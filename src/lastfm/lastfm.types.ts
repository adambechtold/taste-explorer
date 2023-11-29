// This is only a partial response. See the example response under /data/
export type LastFmAccountInfoResponse = {
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

export type LastFmAccount = {
  username: string;
  registeredTime: Date;
  url: string;
  playCount: number;
  trackCount: number;
};
