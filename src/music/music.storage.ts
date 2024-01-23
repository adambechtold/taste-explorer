import {
  PrismaClient,
  Artist as PrismaArtist,
  Track as PrismaTrack,
  Listen as PrismaListen,
} from "@prisma/client";
import { Artist, Track, TrackWithId } from "./music.types";
import * as MusicUtils from "./music.utils";

const prisma = new PrismaClient();

/**
 * Inserts a new artist into the database or updates an existing one based on the
 * artist's Spotify ID.
 *
 * @param {Artist} artist - The artist to insert or update. Must include a `spotifyId`.
 * @returns {Promise<PrismaArtist>} A promise that resolves to the inserted or updated artist.
 * @throws {Error} Will throw an error if the operation fails.
 */
export async function upsertArtist(artist: Artist): Promise<PrismaArtist> {
  const { spotifyId, ...rest } = artist;
  return prisma.artist.upsert({
    where: { spotifyId },
    update: rest,
    create: artist,
  });
}

/**
 * Inserts a new track into the database or updates an existing one based on the
 * track's Spotify ID.
 *
 * @param {Track} track - The track to insert or update. Must include a `spotifyId`.
 * @returns {Promise<PrismaTrackWithArtists>} A promise that resolves to the inserted or updated track with artists.
 * @throws {Error} Will throw an error if the operation fails.
 */
type PrismaTrackWithArtists = {
  artists: PrismaArtist[];
} & PrismaTrack;

export async function upsertTrack(
  track: Track
): Promise<PrismaTrackWithArtists> {
  const savedArtists = await Promise.all(track.artists.map(upsertArtist));

  const { spotifyId, artists, features, ...rest } = track;

  return prisma.track.upsert({
    where: { spotifyId },
    update: {
      ...rest,
      ...features,
      artists: {
        connect: savedArtists.map((artist) => ({ id: artist.id })),
      },
    },
    create: {
      ...rest,
      ...features,
      artists: {
        connect: savedArtists.map((artist) => ({ id: artist.id })),
      },
      spotifyId,
    },
    include: {
      artists: true,
    },
  });
}

/**
 * Creates a new listen record in the database.
 *
 * @param {number} trackId - The ID of the track that was listened to.
 * @param {number} userId - The ID of the user who listened to the track.
 * @param {Date} date - The date and time when the track was listened to.
 * @param {number} [lastfmListenId] - The optional ID of the corresponding Last.fm listen.
 * @returns {Promise<PrismaListen>} A promise that resolves to the created listen record.
 * @throws {Error} Will throw an error if the operation fails.
 *
 * @warning This function does not check if the listen already exists in the database.
 */
export function createListen(
  trackId: number,
  userId: number,
  date: Date,
  lastfmListenId?: number
): Promise<PrismaListen> {
  return prisma.listen.create({
    data: {
      trackId,
      userId,
      listenedAt: date,
      lastfmListenId,
    },
  });
}

/**
 * Finds a track in the database that exactly matches the given track name
 * and at least one artist has the provided artist name.
 *
 * @param {string} trackName - The name of the track to find.
 * @param {string} artistName - The name of the artist of the track to find.
 * @returns {Promise<Track | null>} A promise that resolves to the found track, or null if no track was found.
 * @throws {Prisma.PrismaClientKnownRequestError} If there was an error executing the database query.
 */
export async function findTrackExactMatch(
  trackName: string,
  artistName: string
): Promise<TrackWithId | null> {
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

  if (!prismaTrack) {
    return null;
  }

  return MusicUtils.convertPrismaTrackAndArtistsToTrack(
    prismaTrack,
    prismaTrack.artists
  );
}

/**
 * Finds a previously searched track in the database that matches the given track name and artist name.
 * A track is considered previously searched if there is a LastfmList with the exact same trackName and
 * artistName that has been successfully associated with a Track.
 *
 * @param {string} trackName - The name of the track to find.
 * @param {string} artistName - The name of the artist of the track to find.
 * @returns {Promise<TrackWithId | null>} A promise that resolves to the found track, or null if no track was found.
 */
export async function findTrackPreviousLastfmSearch(
  trackName: string,
  artistName: string
): Promise<TrackWithId | null> {
  // Are there any LastfmListens with this trackName and artistName that have been
  // successfully associated with a Track?
  const listens = (await prisma.$queryRaw`
    SELECT
      Listen.id as listenId,
      Track.id as trackId
    FROM LastfmListen
      JOIN Listen ON Listen.lastfmListenId = LastfmListen.id
      JOIN Track ON Track.id = Listen.trackId
    WHERE
      LastfmListen.analyzedAt IS NOT NULL
      AND
      LastfmListen.trackName = ${trackName}
      AND
      LastfmListen.artistName = ${artistName}
    LIMIT 1
  `) as { listenId: number; trackId: number }[];

  // If not, return null
  if (listens.length === 0) {
    return null;
  }

  // If so, return that Track
  const prismaTrack = await prisma.track.findUnique({
    where: {
      id: listens[0].trackId,
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
    console.error(`Listen ${listens[0].listenId} has no track.`);
    return null;
  }
}
