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
        id: string; // spotify id
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

// Get Many Tracks' Audio Features
// https://developer.spotify.com/documentation/web-api/reference/get-several-audio-features
export type SpotifyAudioFeaturesBatchResponse = {
  audio_features: SpotifyAudioFeaturesResponse[];
};

// Get Single Track's Audio Features
// https://developer.spotify.com/documentation/web-api/reference/get-audio-features
export type SpotifyAudioFeaturesResponse = {
  acousticness: number;
  analysis_url: string;
  danceability: number;
  duration_ms: number;
  energy: number;
  id: string;
  instrumentalness: number;
  key: number;
  liveness: number;
  loudness: number;
  mode: number;
  speechiness: number;
  tempo: number;
  time_signature: number;
  track_href: string;
  type: string;
  uri: string;
  valence: number;
};
