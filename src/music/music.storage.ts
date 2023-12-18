import {
  PrismaClient,
  Artist as PrismaArtist,
  Track as PrismaTrack,
  Listen as PrismaListen,
} from "@prisma/client";
import { Artist, Track } from "./music.types";

const prisma = new PrismaClient({ log: ["query"] });

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
