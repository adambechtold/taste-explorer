import { SpotifyAccessToken } from "../auth/auth.types";
import { UserWithId } from "../users/users.types";
import { TypedError } from "../errors/errors.types";

import * as SpotifyStorage from "./spotify.storage";
import SpotifyApi from "./spotify.api";
import { Track, TrackWithId } from "../music/music.types";

/**
 * Handles the callback from the Spotify login process, exchanging the authorization code for an access token.
 *
 * @param {string | null} code - The authorization code received from Spotify, or null if no code was received.
 * @returns {Promise<AccessToken>} A promise that resolves to an object containing the stored access token, refresh token, expiration date, and the service name ("SPOTIFY").
 * @throws {Error} Will throw an error if the request to the Spotify API fails, or if storing the access token in the database fails.
 */
export async function handleLoginCallback(
  code: string | null,
  user: UserWithId | null,
  sessionId: string | null
): Promise<SpotifyAccessToken> {
  const spotifyApi = new SpotifyApi();
  const accessToken = await spotifyApi.getAccessTokenFromCode(code);

  if (user) {
    // persist access token for user
    await SpotifyStorage.storeSpotifyAccessTokenForUser(
      user,
      accessToken.token,
      accessToken.refreshToken,
      accessToken.expiresAt
    );
  }

  if (sessionId) {
    // persist access token for session
    SpotifyStorage.storeSpotifyAccessTokenForSessionId(sessionId, accessToken);
  }

  return accessToken;
}

/**
 * Retrieves the Spotify access token for a specific user.
 *
 * @param {UserWithId} user - The user for whom to retrieve the access token.
 * @returns {Promise<AccessToken | null>} A promise that resolves to the access token for the user, or null if no access token is found.
 */
export async function getAccessToken(
  user: UserWithId
): Promise<SpotifyAccessToken | null> {
  const currentToken = await SpotifyStorage.getSpotifyAccessTokenForUser(user);

  if (!currentToken) {
    return null;
  }

  const spotifyApi = new SpotifyApi(currentToken);
  const refreshedAccessToken = await spotifyApi.getActiveAccessToken();

  if (refreshedAccessToken.token !== currentToken.token) {
    SpotifyStorage.storeSpotifyAccessTokenForUser(
      user,
      refreshedAccessToken.token,
      refreshedAccessToken.refreshToken,
      refreshedAccessToken.expiresAt
    );
  }

  return refreshedAccessToken;
}

/**
 * Refreshes the Spotify access token for a specific user and stores the new token in the database.
 *
 * @param {AccessToken} accessToken - The current access token for the user.
 * @param {UserWithId} user - The user for whom to refresh the access token.
 * @returns {Promise<AccessToken>} A promise that resolves to the refreshed access token for the user.
 * @throws {Error} Will throw an error if the request to the Spotify API fails, or if storing the refreshed access token in the database fails.
 */
export async function refreshAccessToken(
  accessToken: SpotifyAccessToken,
  user: UserWithId
): Promise<SpotifyAccessToken> {
  const spotifyApi = new SpotifyApi(accessToken);
  const newAccessToken = await spotifyApi.refreshAccessToken();
  return SpotifyStorage.storeSpotifyAccessTokenForUser(
    user,
    newAccessToken.token,
    newAccessToken.refreshToken,
    newAccessToken.expiresAt
  );
}

/**
 * Get the Spotify Track for the given track and artist name.
 *
 * @param {SpotifyAccessToken} accessToken - The access token for the Spotify API.
 * @param {string} trackName - The name of the track to fetch.
 * @param {string} artistName - The name of the artist of the track to fetch.
 * @returns {Promise<Track>} - A promise that resolves to the fetched track.
 * @throws {TypedError} - Will throw an error if no tracks are found for the given track and artist name.
 */
export async function getTrack(
  accessToken: SpotifyAccessToken,
  trackName: string,
  artistName: string
): Promise<Track> {
  const spotifyApi = new SpotifyApi(accessToken);

  const tracks = await spotifyApi.searchTracks(trackName, artistName);

  if (!tracks.length) {
    throw new TypedError(
      `No tracks found for name: ${trackName} by: ${artistName}.`,
      404
    );
  }

  const selectedTrack = tracks[0];

  return selectedTrack;
}

/**
 * Add track features to the tracks provided.
 *
 * @param {TrackWithId[]} tracks - Tracks with or without features.
 * @returns {TrackWithId[]} - Tracks with features.
 */
export async function addFeaturesToTracks(
  access_token: SpotifyAccessToken,
  tracks: TrackWithId[]
) {
  const spotifyApi = new SpotifyApi(access_token);

  const trackSpotifyIds = tracks.map((track) => track.spotifyId);
  const trackFeaturesResponse = await spotifyApi.getTracksFeatures(
    trackSpotifyIds
  );

  const trackFeatures = trackFeaturesResponse.audio_features.filter(
    (f) => f !== null
  );

  const tracksWithFeatures = tracks.map((track) => {
    const featuresForTrack = trackFeatures.find(
      (t) => t.id === track.spotifyId
    );

    if (!featuresForTrack) {
      console.warn("Audio features not found for track", track.spotifyId);
    } else {
      track.features =
        SpotifyStorage.convertSpotifyTrackFeaturesResponseToTrackFeatures(
          featuresForTrack
        );
    }

    return track;
  });

  return tracksWithFeatures;
}

/**
 * Play the Specified Track for the Given User
 */
export async function playTracks(
  accessToken: SpotifyAccessToken,
  tracks: TrackWithId[],
  offset: number = 0
) {
  const spotifyApi = new SpotifyApi(accessToken);

  let trackUris = tracks.map((track) => `spotify:track:${track.spotifyId}`);
  trackUris = trackUris.slice(offset);

  const playResponse = await spotifyApi.startOrResumePlaybackState(trackUris);

  return playResponse;
}

/**
 * Transfer Playback to the provided device.
 * @param {string} deviceId - The ID of the device to transfer playback to.
 * @param {UserWithId} user - The user for whom to transfer playback.
 * @throws {TypedError} - If the user does not have a spotify account.
 */
export async function transferPlaybackToUserDevice(
  deviceId: string,
  user: UserWithId
) {
  const accessToken = await getAccessToken(user);

  if (!accessToken) {
    throw new TypedError(
      "No access token found for user. Login with spotify to continue.",
      400
    );
  }

  const spotifyApi = new SpotifyApi(accessToken);
  await spotifyApi.transferPlaybackToDevice(deviceId);
}
