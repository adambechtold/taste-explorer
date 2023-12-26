import { SpotifyAccessToken } from "../auth/auth.types";
import { UserWithId } from "../users/users.types";
import { TypedError } from "../errors/errors.types";

import * as SpotifyUtils from "./spotify.utils";
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
  user: UserWithId
): Promise<SpotifyAccessToken> {
  const spotifyApi = new SpotifyApi();
  const accessToken = await spotifyApi.getAccessTokenFromCode(code);

  const savedAccessToken = await SpotifyUtils.storeSpotifyAccessTokenForUser(
    user,
    accessToken.token,
    accessToken.refreshToken,
    accessToken.expiresAt
  );

  return savedAccessToken;
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
  return SpotifyUtils.getSpotifyAccessTokenForUser(user);
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
  return SpotifyUtils.storeSpotifyAccessTokenForUser(
    user,
    newAccessToken.token,
    newAccessToken.refreshToken,
    newAccessToken.expiresAt
  );
}

export async function getTrackFromTrackAndArtist(
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

  const includeFeatures = false;
  if (includeFeatures) {
    const trackFeaturesResponse = await spotifyApi.getTracksFeatures([
      selectedTrack.spotifyId,
    ]);
    const selectedTrackFeatures = trackFeaturesResponse.audio_features[0];

    selectedTrack.features =
      SpotifyUtils.convertSpotifyTrackFeaturesResponseToTrackFeatures(
        selectedTrackFeatures
      );
  }

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

  const tracksWithFeatures = trackFeaturesResponse.audio_features.map(
    (trackFeatures) => {
      const trackIndex = tracks.findIndex(
        (t) => t.spotifyId === trackFeatures.id
      );

      if (trackIndex === -1) {
        throw new Error(
          `Track with spotifyId ${trackFeatures.id} not found in tracks array.`
        );
      }
      const track = { ...tracks[trackIndex] };

      track.features =
        SpotifyUtils.convertSpotifyTrackFeaturesResponseToTrackFeatures(
          trackFeatures
        );

      return track;
    }
  );

  return tracksWithFeatures;
}
