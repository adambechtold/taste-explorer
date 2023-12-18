import {
  PrismaClient,
  Artist as PrismaArtist,
  Track as PrismaTrack,
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
 * @returns {Promise<PrismaTrack>} A promise that resolves to the inserted or updated track.
 * @throws {Error} Will throw an error if the operation fails.
 */
export async function upsertTrack(track: Track): Promise<PrismaTrack> {
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
  });
}
