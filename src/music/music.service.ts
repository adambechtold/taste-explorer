import { LastfmListen, PrismaClient, Prisma } from "@prisma/client";
import { TypedError } from "../errors/errors.types";
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
  user: UserWithId
): Promise<LastfmListenBatchImportSize> {
  const logger = new Logger("updateListeningHistory");
  if (!user.lastfmAccount) {
    throw new TypedError(
      `Cannot trigger update listens for user without lastfm account.`,
      400
    );
  }
  const userWithLastfmAccount = user as UserWithLastfmAccountAndId;

  // trigger LastfmService to fetch all listens for user
  const lastfmUpdateTracker = await LastfmService.updateUserListeningHistory(
    userWithLastfmAccount
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
 * Links Last.fm listens to a track by its ID.
 *
 * @param {LastfmListen[]} lastfmListens - An array of Last.fm listens.
 * @param {number} trackId - The ID of the track to link the listens to.
 * @param {boolean} overwrite - If true, existing listens for the Last.fm listens will be overwritten.
 * @returns {Promise<Prisma.BatchPayload>} - A promise that resolves to a Prisma BatchPayload object representing the result of the update operation(s).
 */
export async function linkLastfmListensToTrackById(
  lastfmListens: LastfmListen[],
  trackId: number,
  overwrite: boolean
): Promise<Prisma.BatchPayload> {
  let numberOfUpdates = 0;

  // get existing listens for these last.fm listens
  const existingListens = await prisma.listen.findMany({
    where: {
      lastfmListenId: {
        in: lastfmListens.map((listen) => listen.id),
      },
    },
  });

  // get the set that does not already have listens
  const lastfmListensWithoutListens = lastfmListens.filter(
    (lastfmListen) =>
      !existingListens.some(
        (existingListen) => existingListen.lastfmListenId === lastfmListen.id
      )
  );

  // create listens for these
  const createListenResult = await prisma.listen.createMany({
    data: lastfmListensWithoutListens.map((lastfmListen) => ({
      trackId,
      userId: lastfmListen.userId,
      lastfmListenId: lastfmListen.id,
      listenedAt: lastfmListen.listenedAt,
    })),
  });

  numberOfUpdates += createListenResult.count;

  // if not overwrite, then we  can end here
  if (!overwrite) {
    return {
      count: numberOfUpdates,
    };
  }

  // get the set of last.fm listens that have already been analyzed
  const lastfmListensPreviouslyAnalyzed = lastfmListens.filter((lastfmListen) =>
    existingListens.some(
      (existingListen) => existingListen.lastfmListenId === lastfmListen.id
    )
  );

  // update the track for these
  const listensCreated = await prisma.lastfmListen.updateMany({
    where: {
      id: {
        in: lastfmListensPreviouslyAnalyzed.map(
          (lastfmListen) => lastfmListen.id
        ),
      },
    },
    data: {
      analyzedAt: new Date(),
    },
  });

  numberOfUpdates += listensCreated.count;

  return {
    count: numberOfUpdates,
  };
}

/**
 * Get a track given its name and artist name.
 *
 * If the track is not found in the database already, return null.
 *
 * @param {string} trackName
 * @param {string} artistName
 * @returns {Track | null} - The track, or null if not found in the database or spotify.
 * @throws {TypedError} - If the user does not have a spotify account.
 */
export async function getTrackByNameAndArtistName(
  trackName: string,
  artistName: string
): Promise<TrackWithId | null> {
  const logger = new Logger("createListens");

  // Find Track and Artist in Database
  const exactMatchTrack = await MusicStorage.findTrackExactMatch(
    trackName,
    artistName
  );

  if (exactMatchTrack) {
    logger.log("Found exact match in database.");
    return exactMatchTrack;
  }

  // Have we ever searched for this track before?
  const previousMatchTrack = await MusicStorage.findTrackPreviousLastfmSearch(
    trackName,
    artistName
  );

  if (previousMatchTrack) {
    logger.log("Found previous match in database.");
    return previousMatchTrack;
  }

  return null;
}

/**
 * This asynchronous function stores a track for Spotify lookup.
 *
 * @param {string} trackName - The name of the track.
 * @param {string} artistName - The name of the artist.
 * @throws {Prisma.PrismaClientKnownRequestError} When a Prisma Client error occurs, except for the "P2002" error which is handled internally.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function storeTrackForSpotifyLookup(
  trackName: string,
  artistName: string
) {
  const logger = new Logger("createListens");
  try {
    await prisma.spotifyTrackSearchQueue.create({
      data: {
        trackName,
        artistName,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // ignore duplicate
        logger.log(
          `Duplicate track search request. Ignoring. trackName: ${trackName}, artistName: ${artistName}`
        );
        return;
      }
    }
    throw error;
  }
}

/**
 * This function adds features to an array of tracks and stores them.
 *
 * @param {TrackWithId[]} tracks - An array of tracks to which features will be added.
 * @returns {Promise<TrackWithId[]>} - A promise that resolves to an array of tracks with features.
 */
export async function addFeaturesToTracks(
  tracks: TrackWithId[]
): Promise<TrackWithId[]> {
  const accessToken = await getSpotifyAccessToken();
  const tracksWithFeatures = await SpotifyService.addFeaturesToTracks(
    accessToken,
    tracks
  );

  tracksWithFeatures.forEach((track) => {
    track.featuresAnalyzedAt = new Date();
  });

  const prismaTracks = await Promise.all(
    tracksWithFeatures.map((track) => MusicStorage.upsertTrack(track))
  );

  return prismaTracks.map((prismaTrack) =>
    MusicUtils.convertPrismaTrackAndArtistsToTrack(prismaTrack, [])
  );
}

/**
 * This asynchronous function retrieves a Spotify access token.
 *
 * @throws {TypedError} When no access token is found for the user.
 * @returns {Promise<string>} A promise that resolves to the Spotify access token.
 */
async function getSpotifyAccessToken() {
  // Track not found in the database. Search Spotify.
  const accessToken = await SpotifyService.getAccessToken({
    id: 1, // TODO: Consider which access token to use when performing backend search operations.
  } as UserWithId);

  if (!accessToken) {
    throw new TypedError(
      "No access token found for user. Login with spotify to continue.",
      400
    );
  }

  return accessToken;
}

/**
 * Plays a track on the user's Spotify account.
 * @param {number} trackId - The ID of the track to play.
 * @param {number} offset - The offset in milliseconds to start playing the track.
 * @param {UserWithId} user - The user for whom to play the track.
 * @throws {TypedError} - If the track is not found.
 */
export async function playTracks(
  trackIds: number[],
  offset: number,
  sessionId: string
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
    MusicUtils.convertPrismaTrackAndArtistsToTrack(prismaTrack, [])
  );

  await SpotifyService.playTracks(accessToken, tracks, offset);
}

/**
 * Transfer Playback to the provided device.
 * @param {string} deviceId - The ID of the device to transfer playback to.
 * @param {UserWithId} user - The user for whom to transfer playback.
 * @throws {TypedError} - If the user does not have a spotify account.
 * Not documented in the OpenAPI spec.
 */
export async function transferPlaybackToUserDevice(
  deviceId: string,
  user: UserWithId
) {
  return SpotifyService.transferPlaybackToUserDevice(deviceId, user);
}
