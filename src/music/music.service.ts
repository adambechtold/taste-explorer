import { PrismaClient } from "@prisma/client";
import { TypedError } from "../errors/errors.types";
import { UserWithId, UserWithLastfmAccountAndId } from "../users/users.types";
import { LastfmListenBatchImportSize } from "../lastfm/lastfm.types";

import { Track, TrackWithId } from "./music.types";

import * as LastfmService from "../lastfm/lastfm.service";
import * as SpotifyService from "../spotify/spotify.service";
import * as MusicUtils from "./music.utils";
import * as MusicStorage from "./music.storage";

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
  const track = await getTrackByNameAndArtistName(
    lastfmListens[0].trackName,
    lastfmListens[0].artistName
  );

  if (!track) {
    throw new TypedError("Track not found in the database or Spotify.", 404);
  }

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

  try {
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
    console.error(
      `Track ${trackName} by ${artistName} not found in Spotify.\n`,
      error
    );
    return null;
  }
}
