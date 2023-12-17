export type AccessToken = {
  token: string;
  refreshToken: string;
  expiresAt: Date;
  service: "SPOTIFY" | "LASTFM";
};

export type SpotifyAccessToken = AccessToken & {
  service: "SPOTIFY";
};
