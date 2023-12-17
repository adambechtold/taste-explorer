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
        images: {
          url: string;
          height: number;
          width: number;
        }[];
      };
      artists: {
        name: string;
      }[];
      id: string;
      name: string;
      external_ids: {
        isrc?: string; // International Standard Recording Code
        ean?: string; // International Article Number
        upc?: string; // Universal Product Code
      };
      popularity: number; // 0-100
    }[];
  };
};
