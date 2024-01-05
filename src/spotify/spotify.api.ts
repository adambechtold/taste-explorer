import querystring from "querystring";
import { generateRandomString } from "../utils/string.utils";
import { TooManyRequestsError, TypedError } from "../errors/errors.types";

import { SpotifyAccessToken } from "../auth/auth.types";
import {
  SpotifyAccessTokenResponse,
  SpotifyAudioFeaturesBatchResponse,
  SpotifySearchResults,
} from "./spotify.types";
import { Track } from "../music/music.types";

/**
 * A wrapper around spotify's api
 */
export default class SpotifyApi {
  private accessToken: SpotifyAccessToken | undefined;
  private clientId: string;
  private clientSecret: string;

  constructor(accessToken?: SpotifyAccessToken) {
    this.clientId = getClientId();
    this.clientSecret = getClientSecret();
    this.accessToken = accessToken;
  }

  setAccessToken(accessToken: SpotifyAccessToken) {
    this.accessToken = accessToken;
  }

  /**
   * Provides the current access token, or refreshes the token if it has expired.
   *
   * @returns {Promise<SpotifyAccessToken>} A promise that resolves to the current access token.
   */
  async getActiveAccessToken(): Promise<SpotifyAccessToken> {
    if (!this.accessToken) {
      throw new Error("No access token set");
    }
    if (this.accessToken.expiresAt < new Date()) {
      this.accessToken = await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  /**
   * Refreshes the current Spotify access token.
   *
   * @returns {Promise<SpotifyAccessToken>} A promise that resolves to the refreshed access token.
   * @throws {Error} Will throw an error if no access token is currently set.
   */
  async refreshAccessToken(): Promise<SpotifyAccessToken> {
    if (!this.accessToken) {
      throw new Error("No access token set");
    }
    return refreshSpotifyToken(this.accessToken);
  }

  getCallbackEndpoint() {
    return "/login/spotify/callback";
  }

  getRedirectUrl() {
    return "http://localhost:4000/auth" + this.getCallbackEndpoint();
  }

  getUrlToRedirectToLogin() {
    const state = generateRandomString(16);
    const scope =
      "user-read-private user-read-email user-modify-playback-state streaming";

    return (
      "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: this.clientId,
        scope: scope,
        redirect_uri: this.getRedirectUrl(),
        state: state,
      })
    );
  }

  /**
   * Retrieves a new Spotify access token using the provided authorization code.
   * See the Spotify API documentation for more information:
   * https://developer.spotify.com/documentation/general/guides/authorization-guide/#authorization-code-flow
   *
   * @param {string | null} code - The authorization code received from Spotify's authorization flow.
   * @returns {Promise<AccessToken>} A promise that resolves to an object containing the new access token, the refresh token, the expiration date, and the service name ("SPOTIFY").
   * @throws {Error} Will throw an error if the request to the Spotify API fails.
   */
  async getAccessTokenFromCode(
    code: string | null
  ): Promise<SpotifyAccessToken> {
    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: this.getRedirectUrl(),
        grant_type: "authorization_code",
      },
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(this.clientId + ":" + this.clientSecret).toString(
            "base64"
          ),
      },
      json: true,
    };

    const authTokenResponse = await fetch(authOptions.url, {
      method: "POST",
      headers: authOptions.headers,
      body: querystring.stringify(authOptions.form),
    });

    const authTokenJson =
      (await authTokenResponse.json()) as SpotifyAccessTokenResponse;

    return {
      token: authTokenJson.access_token,
      refreshToken: authTokenJson.refresh_token,
      expiresAt: new Date(Date.now() + authTokenJson.expires_in * 1000),
      service: "SPOTIFY",
    };
  }

  /**
   * Searches for a track on Spotify using the track name and artist name.
   *
   * @param {string} trackName - The name of the track to search for.
   * @param {string} artistName - The name of the artist of the track to search for.
   * @returns {Promise<Track[]>} A promise that resolves to an array of tracks that match the search criteria.
   * @throws {Error} Will throw an error if no access token is set.
   */
  async searchTracks(trackName: string, artistName: string): Promise<Track[]> {
    const accessToken = await this.getActiveAccessToken();
    return searchSpotifyTracks(trackName, artistName, accessToken.token);
  }

  async getTracksFeatures(
    spotifyIds: string[]
  ): Promise<SpotifyAudioFeaturesBatchResponse> {
    if (!this.accessToken) {
      throw new Error("No access token set");
    }
    if (this.accessToken.expiresAt < new Date()) {
      this.accessToken = await this.refreshAccessToken();
    }

    return getTracksFeatures(this.accessToken, spotifyIds);
  }

  /**
   * Start or Resume Playback State
   *
   * Start a new context or resume current playback on the user's active device.
   * Provide a list of track uris to play. The tracks will be played in the order
   * provided and will begin playing at the first track.
   *
   * The user is determined by the API object's access token.
   * The device will be the user's current device.
   *
   * @param {string[]} uris - The Spotify track uris to play.
   * @returns {Promise<void>} - A promise that resolves when the request is complete.
   * @throws {Error} - Will throw an error if the operation fails.
   */
  async startOrResumePlaybackState(uris: string[]) {
    if (!this.accessToken) {
      throw new Error("No access token set");
    }

    if (this.accessToken.expiresAt < new Date()) {
      this.accessToken = await this.refreshAccessToken();
    }

    return startOrResumePlaybackState(this.accessToken, uris);
  }

  /**
   * Transfer Playback to the provided Device ID.
   *
   * This will only work is the new device is active
   * and on the same Spotify account as the API object's access token.
   *
   * @param {string} deviceId - The ID of the device to transfer playback to.
   * @returns
   * @throws {Error} - Will throw an error if the operation fails.
   */
  async transferPlaybackToDevice(deviceId: string) {
    if (!this.accessToken) {
      throw new Error("No access token set");
    }

    if (this.accessToken.expiresAt < new Date()) {
      this.accessToken = await this.refreshAccessToken();
    }

    return transferPlayback(this.accessToken, deviceId);
  }
}

/**
 * Retrieves a new Spotify access token for the user, using the refresh token.
 * Stores the new token in the database.
 *
 * @param {AccessToken} accessToken - The current access token object, which includes the refresh token.
 * @returns {Promise<AccessToken>} A promise that resolves to an object containing the new access token, the same refresh token, the new expiration date, and the service name ("SPOTIFY").
 * @throws {Error} Will throw an error if the request to the Spotify API fails, or if storing the new access token in the database fails.
 */
async function refreshSpotifyToken(
  accessToken: SpotifyAccessToken
): Promise<SpotifyAccessToken> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(getClientId() + ":" + getClientSecret()).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: accessToken.refreshToken,
    }),
  });
  const body = (await response.json()) as SpotifyAccessTokenResponse;

  return {
    token: body.access_token,
    refreshToken: accessToken.refreshToken,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
    service: "SPOTIFY",
  };
}

/**
 * Retrieves the Spotify client ID from the environment variables.
 *
 * @returns {string} The Spotify client ID.
 * @throws {Error} Will throw an error if the SPOTIFY_CLIENT_ID environment variable is not set.
 */
function getClientId(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing SPOTIFY_CLIENT_ID");
  }
  return clientId;
}

/**
 * Retrieves the Spotify client secret from the environment variables.
 *
 * @returns {string} The Spotify client secret.
 * @throws {Error} Will throw an error if the SPOTIFY_CLIENT_SECRET environment variable is not set.
 */
function getClientSecret(): string {
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_SECRET");
  }
  return clientSecret;
}

/**
 * Searches for tracks on Spotify using the track name and artist name.
 *
 * @param {string} trackName - The name of the track to search for.
 * @param {string} artistName - The name of the artist of the track to search for.
 * @returns {Promise<Track[]>} A promise that resolves to an array of tracks that match the search criteria. Each track object includes the track name, the artists, and the Spotify ID of the track.
 * @throws {Error} Will throw an error if the request to the Spotify API fails.
 */
async function searchSpotifyTracks(
  trackName: string,
  artistName: string,
  token: string
): Promise<Track[]> {
  const searchOptions = {
    url: "https://api.spotify.com/v1/search",
    qs: {
      q:
        "track:" +
        trackName.replace(/'/g, "") + // remove apostrophes this tends to get better results
        " artist:" +
        artistName.replace(/'/g, ""), // remove apostrophes
      type: "track",
      limit: 1,
    },
    headers: {
      Authorization: "Bearer " + token,
    },
    json: true,
  };

  const searchResponse = await fetch(
    searchOptions.url + "?" + querystring.stringify(searchOptions.qs),
    {
      method: "GET",
      headers: searchOptions.headers,
    }
  );

  if (!searchResponse.ok) {
    if (searchResponse.status === 429) {
      const retryAfterHeader = searchResponse.headers.get("Retry-After");
      let retryAfter: number | undefined = undefined;
      if (retryAfterHeader) {
        retryAfter = parseInt(retryAfterHeader);
      }
      throw new TooManyRequestsError(
        "Too many requests to Spotify API",
        retryAfter
      );
    }
    throw new Error("Error searching tracks: " + searchResponse.statusText);
  }

  const searchJson = (await searchResponse.json()) as SpotifySearchResults;

  const tracks: Track[] = searchJson.tracks.items.map((track) => ({
    name: track.name,
    spotifyId: track.id,
    internationalArticleNumber: track.external_ids.ean,
    internationalRecordingCode: track.external_ids.isrc,
    universalProductCode: track.external_ids.upc,
    artists: track.artists.map((a) => ({
      name: a.name,
      spotifyId: a.id,
    })),
    imageUrl: track.album.images[0].url,
  }));

  return tracks;
}

/**
 * Retrieves the audio features for a batch of tracks from the Spotify API.
 *
 * @param {SpotifyAccessToken} accessToken - The access token for the Spotify API.
 * @param {string[]} ids - An array of Spotify track IDs for which to retrieve audio features.
 * @returns {Promise<SpotifyAudioFeaturesBatchResponse>} A promise that resolves to an object containing the audio features for each track.
 * @throws {Error} Will throw an error if the request to the Spotify API fails.
 */
export async function getTracksFeatures(
  accessToken: SpotifyAccessToken,
  ids: string[]
): Promise<SpotifyAudioFeaturesBatchResponse> {
  const response = await fetch(
    `https://api.spotify.com/v1/audio-features?ids=${ids.join(",")}`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + accessToken.token,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("Retry-After");
      throw new TooManyRequestsError(
        "Too many requests to Spotify API",
        retryAfterHeader ? parseInt(retryAfterHeader) : undefined
      );
    }

    throw new Error("Error getting tracks features: " + response.statusText);
  }

  return (await response.json()) as SpotifyAudioFeaturesBatchResponse;
}

/**
 * Start/Resume Playback
 * Start a new context or resume current playback on the user's active device.
 *
 * https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback
 *
 * @param {SpotifyAccessToken} accessToken - The access token for the Spotify API.
 * @param {string[]} uris - A set of Spotify URIs for the tracks to play.
 * @returns {Promise<void>} A promise that resolves when the request is complete.
 * @throws {Error} Will throw an error if the request to the Spotify API fails.
 */
export async function startOrResumePlaybackState(
  accessToken: SpotifyAccessToken,
  uris: string[]
) {
  const response = await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + accessToken.token,
    },
    body: JSON.stringify({
      uris,
    }),
  });

  if (response.status !== 204 && response.status !== 202) {
    throw TypedError.create(
      "Error modifying playback " + response.statusText,
      response.status
    );
  }

  return;
}

/**
 * Transfers playback to a device.
 *
 * @param {SpotifyAccessToken} accessToken - The access token for the Spotify API.
 * @param {string} deviceId - The ID of the device to transfer playback to.
 * @returns - A promise that resolves when the request is complete.
 * @throws {TypedError} - Will throw an error if the request to the Spotify API fails.
 */
async function transferPlayback(
  accessToken: SpotifyAccessToken,
  deviceId: string
) {
  const response = await fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + accessToken.token,
    },
    body: JSON.stringify({
      device_ids: [deviceId],
      play: true,
    }),
  });

  if (response.status !== 204) {
    throw TypedError.create(
      "Error modifying playback " + response.statusText,
      response.status
    );
  }

  return;
}
