import { PrismaClient } from "@prisma/client";
import { TrackNotFoundError, TypedError } from "../errors/errors.types";
import { UserWithId, UserWithLastfmAccountAndId } from "../users/users.types";
import { LastfmListenBatchImportSize } from "../lastfm/lastfm.types";
import { getSpotifyAccessTokenForSessionId } from "../spotify/spotify.storage";
import { Logger } from "../utils/log.utils";

import { TrackWithId } from "./music.types";

import * as LastfmService from "../lastfm/lastfm.service";
import * as SpotifyService from "../spotify/spotify.service";
import * as MusicUtils from "./music.utils";
import * as MusicStorage from "./music.storage";
import { markUserUpdatingHistoryStatus } from "../users/users.storage";

const prisma = new PrismaClient({ log: ["error"] });

/**
 * Triggers an update of a user's listening history from last.fm.
 *
 * @param {UserWithId} user - The user for whom to update listening history.
 * @returns {Promise<LastfmListenBatchImportSize>} - A promise that resolves to the number of listens imported.
 * @throws {TypedError} - If the user does not have a last.fm account.
 */
export async function triggerUpdateListensForUser(
  user: UserWithId,
): Promise<LastfmListenBatchImportSize> {
  const logger = new Logger("updateListeningHistory");
  if (!user.lastfmAccount) {
    throw new TypedError(
      `Cannot trigger update listens for user without lastfm account.`,
      400,
    );
  }
  const userWithLastfmAccount = user as UserWithLastfmAccountAndId;

  // trigger LastfmService to fetch all listens for user
  const lastfmUpdateTracker = await LastfmService.updateUserListeningHistory(
    userWithLastfmAccount,
  );

  // END
  lastfmUpdateTracker.onEnd(() => {
    markUserUpdatingHistoryStatus(user.id, false, new Date());
  });

  // ERROR
  lastfmUpdateTracker.onError((error) => {
    logger.error(error);
    markUserUpdatingHistoryStatus(user.id, false);
  });

  // START
  return new Promise((resolve, reject) => {
    lastfmUpdateTracker.onStart((size) => {
      resolve(size);
    });
  });
}

/**
 * Retrieves a track given its last.fm listen.
 *
 * @param {number} lastfmListenId - The Id of the last.fm listen.
 * @returns {Promise<Track | null>} - A promise that resolves with the track or "null" if not found.
 * @throws {TypedError} - If the last.fm listen is not found.
 */
export async function getTrackFromLastfmListenId(
  lastfmListenId: number,
): Promise<TrackWithId> {
  const logger = new Logger("createListens");

  // Find Existing Listen
  const listen = await prisma.listen.findUnique({
    where: {
      lastfmListenId: lastfmListenId,
    },
  });

  // If Found, Return Corresponding Track
  if (listen) {
    const prismaTrack = await prisma.track.findUnique({
      where: { id: listen.trackId },
      include: { artists: true },
    });

    if (prismaTrack) {
      return MusicUtils.convertPrismaTrackAndArtistsToTrack(
        prismaTrack,
        prismaTrack.artists,
      );
    } else {
      // This should never happen. All Listens should have a Track.
      logger.error(`Listen ${listen.id} has no track.`);
    }
  }

  // If Not Found, Get Track Information from Lastfm Listen
  const lastfmListens = await prisma.lastfmListen.findMany({
    select: {
      trackName: true,
      artistName: true,
    },
    where: { id: lastfmListenId },
  });

  if (!lastfmListens) {
    throw new TypedError("Lastfm Listen not found", 404);
  }

  // Use Search to Find the Track
  let track: TrackWithId | null = null;
  const { trackName, artistName } = lastfmListens[0];
  try {
    track = await getTrackByNameAndArtistName({
      trackName,
      artistName,
    });
  } catch (error) {
    if (error instanceof TypedError) {
      if (error.status === 404) {
        logger.log(
          "track not found. Marking lastfm listen as analyzed, as well as any other listens with the same track name and artist name",
        );
        const result = await prisma.lastfmListen.updateMany({
          where: {
            OR: [
              { id: lastfmListenId },
              {
                AND: [
                  { trackName: lastfmListens[0].trackName },
                  { artistName: lastfmListens[0].artistName },
                ],
              },
            ],
          },
          data: {
            analyzedAt: new Date(),
          },
        });
        logger.log(`Marked ${result.count} listens as analyzed.`);
      } else {
        throw error;
      }
    }
    throw error;
  }

  if (!track) {
    const result = await prisma.lastfmListen.updateMany({
      where: {
        trackName: lastfmListens[0].trackName,
        artistName: lastfmListens[0].artistName,
      },
      data: {
        analyzedAt: new Date(),
      },
    });
    logger.log(
      `Lastfm Listen ${lastfmListenId}'s track was not found in Spotify. Marked ${result.count} listens as analyzed.`,
    );
    throw TypedError.create("Track not found in the database or Spotify.", 404);
  } else {
    // Link all last.fm listens with the same track name and artist name to this track
    const result =
      await LastfmService.linkTrackIdToAllLastfmListensWithTrackNameAndArtistName(
        {
          trackId: track.id,
          trackName: lastfmListens[0].trackName,
          artistName: lastfmListens[0].artistName,
          overwrite: true,
        },
      );

    logger.log(
      `Linked ${result.count} listens to track ${track.name} while researching lastfmListen #${lastfmListenId}.`,
    );

    return track;
  }
}

/**
 * Get a track given its name and artist name.
 *
 * If the track is not found in the database already, search spotify and add it to the database.
 *
 * @param {string} trackName
 * @param {string} artistName
 * @returns {Track | null} - The track, or null if not found in the database or spotify.
 * @throws {TypedError} - If the user does not have a spotify account.
 */
export async function getTrackByNameAndArtistName(params: {
  trackName: string;
  artistName: string;
}): Promise<TrackWithId> {
  const logger = new Logger("createListens"); // TODO: Remove from the body of this function; It shouldn't have to know about the logger.
  const { trackName, artistName } = params;

  // Find Track and Artist in Database
  const exactMatchTrack = await MusicStorage.findTrackExactMatch(
    trackName,
    artistName,
  );
  if (exactMatchTrack) {
    logger.log("Found exact match in database.");
    return exactMatchTrack;
  }

  // Have we ever searched for this track before?
  const previousMatchTrack = await MusicStorage.findTrackPreviousLastfmSearch(
    trackName,
    artistName,
  );
  if (previousMatchTrack) {
    logger.log("Found previous match in database.");
    return previousMatchTrack;
  }

  // Track not found in the database. Search Spotify.
  try {
    const accessToken = await getSpotifyAccessToken();
    const track = await SpotifyService.getTrack(
      accessToken,
      trackName,
      artistName,
    );

    await Promise.all(track.artists.map((a) => MusicStorage.upsertArtist(a)));
    const prismaTrack = await MusicStorage.upsertTrack(track);

    logger.log(
      `Found track in spotify: ${track.name} by ${track.artists
        .map((a) => a.name)
        .join(", ")}`,
    );
    return {
      id: prismaTrack.id,
      ...track,
    };
  } catch (error) {
    if (error instanceof TypedError) {
      throw error;
    }

    logger.error(
      `Track ${trackName} by ${artistName} not found in Spotify.\n`,
      error,
    );
    throw new TrackNotFoundError(
      `Track ${trackName} by ${artistName} not found`,
    );
  }
}

/**
 * This function adds features to an array of tracks and stores them.
 *
 * @param {TrackWithId[]} tracks - An array of tracks to which features will be added.
 * @returns {Promise<TrackWithId[]>} - A promise that resolves to an array of tracks with features.
 */
export async function addFeaturesToTracks(
  tracks: TrackWithId[],
): Promise<TrackWithId[]> {
  const accessToken = await getSpotifyAccessToken();
  const tracksWithFeatures = await SpotifyService.addFeaturesToTracks(
    accessToken,
    tracks,
  );

  tracksWithFeatures.forEach((track) => {
    track.featuresAnalyzedAt = new Date();
  });

  const prismaTracks = await Promise.all(
    tracksWithFeatures.map((track) => MusicStorage.upsertTrack(track)),
  );

  return prismaTracks.map((prismaTrack) =>
    MusicUtils.convertPrismaTrackAndArtistsToTrack(prismaTrack, []),
  );
}

async function getSpotifyAccessToken() {
  // Track not found in the database. Search Spotify.
  const accessToken = await SpotifyService.getAccessToken({
    id: 1, // TODO: Consider which access token to use when performing backend search operations.
  } as UserWithId);

  if (!accessToken) {
    throw new TypedError(
      "No access token found for user. Login with spotify to continue.",
      400,
    );
  }

  return accessToken;
}

export async function playTracks(
  trackIds: number[],
  offset: number = 0,
  sessionId: string,
) {
  const accessToken = getSpotifyAccessTokenForSessionId(sessionId);

  if (!accessToken) {
    throw TypedError.create("No access token found for this session", 401);
  }

  const prismaTracks = await prisma.track.findMany({
    where: {
      id: {
        in: trackIds,
      },
    },
  });

  if (!prismaTracks.length) {
    throw TypedError.create("No tracks found", 404);
  }

  const tracks = prismaTracks.map((prismaTrack) =>
    MusicUtils.convertPrismaTrackAndArtistsToTrack(prismaTrack, []),
  );

  await SpotifyService.playTracks(accessToken, tracks, offset);
}

/**
 * Transfer Playback to the provided device.
 *
 * @param {string} deviceId - The ID of the device to transfer playback to.
 * @param {UserWithId} user - The user for whom to transfer playback.
 * @throws {TypedError} - If the user does not have a spotify account.
 * Not documented in the OpenAPI spec.
 */
export async function transferPlaybackToUserDevice(
  deviceId: string,
  user: UserWithId,
) {
  return SpotifyService.transferPlaybackToUserDevice(deviceId, user);
}
