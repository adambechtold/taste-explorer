import { PrismaClient } from "@prisma/client";
import { TypedError } from "../errors/errors.types";
import { UserWithId, UserWithLastfmAccountAndId } from "../users/users.types";
import { LastfmListenBatchImportSize } from "../lastfm/lastfm.types";
import { sleep } from "../utils/misc.utils";

import { Track, TrackWithId } from "./music.types";

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

  let hasFinished = false;

  // END
  lastfmUpdateTracker.onEnd(() => {
    hasFinished = true;
    sleep(10).then(() => {
      // TODO: Remove this sleep. Find a more robust way of ensuring the onEnd event runs after onStart (or onStart doesn't update analysis status)
      markUserUpdatingHistoryStatus(user.id, false, new Date());
    });
  });

  // ERROR
  lastfmUpdateTracker.onError((error) => {
    console.error(error);
    markUserUpdatingHistoryStatus(user.id, false);
  });

  // START
  return new Promise((resolve, reject) => {
    lastfmUpdateTracker.onStart((size) => {
      if (!hasFinished) {
        markUserUpdatingHistoryStatus(user.id, true);
      }
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
  lastfmListenId: number
): Promise<Track | null> {
  // Find Existing Listen
  const listen = await prisma.listen.findUnique({
    where: {
      lastfmListenId: lastfmListenId,
    },
  });

  // If Found, Return Corresponding Track
  if (listen) {
    const prismaTrack = await prisma.track.findUnique({
      where: {
        id: listen.trackId,
      },
      include: {
        artists: true,
      },
    });

    if (prismaTrack) {
      return MusicUtils.convertPrismaTrackAndArtistsToTrack(
        prismaTrack,
        prismaTrack.artists
      );
    } else {
      // This should never happen. All Listens should have a Track.
      console.error(`Listen ${listen.id} has no track.`);
    }
  }

  // If Not Found, Get Track Information from Lastfm Listen
  const lastfmListens = await prisma.lastfmListen.findMany({
    select: {
      trackName: true,
      artistName: true,
    },
    where: {
      id: lastfmListenId,
    },
  });

  if (!lastfmListens) {
    throw new TypedError("Lastfm Listen not found", 404);
  }

  // Use Search to Find the Track
  let track: TrackWithId | null = null;
  try {
    track = await getTrackByNameAndArtistName(
      lastfmListens[0].trackName,
      lastfmListens[0].artistName
    );
  } catch (error) {
    if (error instanceof TypedError) {
      if (error.status === 404) {
        console.log(
          "track not found. Marking lastfm listen as analyzed, as well as any other listens with the same track name and artist name"
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
        console.log(`Marked ${result.count} listens as analyzed.`);
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
    console.log(
      `Lastfm Listen ${lastfmListenId}'s track was not found in Spotify. Marked ${result.count} listens as analyzed.`
    );
    throw TypedError.create("Track not found in the database or Spotify.", 404);
  } else {
    // Link all last.fm listens with the same track name and artist name to this track
    const result =
      await LastfmService.linkTrackIdToAllLastfmListensWithTrackNameAndArtistName(
        track.id,
        lastfmListens[0].trackName,
        lastfmListens[0].artistName,
        true
      );

    console.log(
      `Linked ${result.count} listens to track ${track.name} while researching lastfmListen #${lastfmListenId}.`
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
export async function getTrackByNameAndArtistName(
  trackName: string,
  artistName: string
): Promise<TrackWithId | null> {
  // Find Track and Artist in Database
  const artists = await prisma.artist.findMany({
    select: {
      id: true,
    },
    where: {
      name: artistName,
    },
  });

  const prismaTrack = await prisma.track.findFirst({
    where: {
      name: trackName,
      artists: {
        some: {
          id: {
            in: artists.map((artist) => artist.id),
          },
        },
      },
    },
    include: {
      artists: true,
    },
  });

  if (prismaTrack) {
    return MusicUtils.convertPrismaTrackAndArtistsToTrack(
      prismaTrack,
      prismaTrack.artists
    );
  }

  try {
    const accessToken = await getSpotifyAccessToken();

    const track = await SpotifyService.getTrackFromTrackAndArtist(
      accessToken,
      trackName,
      artistName
    );

    await Promise.all(track.artists.map((a) => MusicStorage.upsertArtist(a)));
    const prismaTrack = await MusicStorage.upsertTrack(track);

    return {
      id: prismaTrack.id,
      ...track,
    };
  } catch (error) {
    if (error instanceof TypedError) {
      throw error;
    }

    console.error(
      `Track ${trackName} by ${artistName} not found in Spotify.\n`,
      error
    );
    return null;
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
export async function playTracksForUser(
  trackIds: number[],
  offset: number,
  user: UserWithId
) {
  // TODO: Consider which access token to get based on the user.
  const accessToken = await getSpotifyAccessToken();

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
 */
export async function transferPlaybackToUserDevice(
  deviceId: string,
  user: UserWithId
) {
  return SpotifyService.transferPlaybackToUserDevice(deviceId, user);
}
