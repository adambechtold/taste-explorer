export type SpotifyAccessTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
};

// https://developer.spotify.com/documentation/web-api/reference/search
export type SpotifySearchResults = {
  tracks: {
    items: {
      album: {
        name: string;
      };
      artists: {
        name: string;
      }[];
      id: string;
      name: string;
    }[];
  };
};
