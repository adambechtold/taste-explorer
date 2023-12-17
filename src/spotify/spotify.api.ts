import querystring from "querystring";
import { generateRandomString } from "../utils/string.utils";

import { AccessToken } from "../auth/auth.types";
import { SpotifyAccessTokenResponse } from "./spotify.types";

/**
 * A wrapper around spotify's api
 */
export default class SpotifyApi {
  private accessToken: AccessToken | undefined;
  private clientId: string;
  private clientSecret: string;

  constructor(accessToken?: AccessToken) {
    this.clientId = getClientId();
    this.clientSecret = getClientSecret();
    this.accessToken = accessToken;
  }

  setAccessToken(accessToken: AccessToken) {
    this.accessToken = accessToken;
  }

  async refreshAccessToken(): Promise<AccessToken> {
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
    const scope = "user-read-private user-read-email";

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
  async getAccessTokenFromCode(code: string | null): Promise<AccessToken> {
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
  accessToken: AccessToken
): Promise<AccessToken> {
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
