import { PrismaClient } from "@prisma/client";

import { UserWithId } from "../../users/users.types";
import {
  Playlist,
  PreferenceType,
  reversePreferenceType,
} from "./playlists.types";
import { PlaylistCache } from "./playlists.cache";

const prisma = new PrismaClient();

const MAX_NUM_USERS = 10;
const PLAYLISTS_PER_USER = 3;
const MAX_TRACKS_PER_PLAYLIST = 50;
const MAX_NUM_TRACKS =
  MAX_NUM_USERS * PLAYLISTS_PER_USER * MAX_TRACKS_PER_PLAYLIST;

const playlistCache = new PlaylistCache(MAX_NUM_TRACKS);

type LikedTracksQueryResponse = {
  trackId: number;
  user1Count: number;
  user2Count: number;
}[];

/**
 * This function retrieves a playlist for two users based on their shared music preferences.
 *
 * @remarks
 * The system first checks a playlist cache to see if a playlist for the given users
 * and preference type already exists. If a playlist is found in the cache, the function
 * returns the playlist. If not, the function retrieves the tracks that match the users'
 * shared music preferences from the database and creates a playlist object.
 * The playlist object is then added to the cache.
 *
 * @param {UserWithId} user1 - The first user.
 * @param {UserWithId} user2 - The second user.
 * @param {PreferenceType} preferenceType - The type of music preference to consider when generating the playlist.
 *
 * @returns {Promise<Playlist>} A Promise that resolves to a Playlist object. The Playlist object contains tracks that match the users' shared music preferences.
 *
 * @throws {Error} If there is an error retrieving the tracks from the database or the cache.
 */
export async function getPlaylist(
  user1: UserWithId,
  user2: UserWithId,
  preferenceType: PreferenceType,
): Promise<Playlist> {
  const key = PlaylistCache.createKey([user1.id, user2.id], preferenceType);
  const alternativeKey = PlaylistCache.createKey(
    [user2.id, user1.id],
    reversePreferenceType(preferenceType),
  );

  const cachedPlaylist = playlistCache.get(key, alternativeKey);

  if (cachedPlaylist) {
    return cachedPlaylist;
  }

  const tracksMatchingPreferenceType = await getTrackIdsByPreferenceType(
    user1,
    user2,
    preferenceType,
  );

  const tracks = (
    await prisma.track.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        spotifyId: true,
        artists: {
          select: {
            name: true,
            spotifyId: true,
          },
        },
      },
      where: {
        id: {
          in: tracksMatchingPreferenceType.map((track) => track.trackId),
        },
      },
    })
  ).map((track) => ({ ...track, imageUrl: track.imageUrl || undefined }));

  const playlist: Playlist = {
    tracks: { items: tracks },
  };

  playlistCache.set(key, playlist);

  return playlist;
}

/**
 * Caches all playlists for two users based on their preference types.
 *
 * This function iterates over each preference type ("BOTH", "USER1-ONLY", "USER2-ONLY") and calls the `getPlaylist` function for each type.
 * The `getPlaylist` function is assumed to cache the playlist for the given users and preference type.
 *
 * @param {UserWithId} user1 - The first user.
 * @param {UserWithId} user2 - The second user.
 * @r
 */
export async function preLoadAllPlaylists(
  user1: UserWithId,
  user2: UserWithId,
): Promise<void> {
  const preferenceTypes: PreferenceType[] = [
    "BOTH",
    "USER1-ONLY",
    "USER2-ONLY",
  ];

  console.time(`Preloading playlists for ${user1.id} and ${user2.id}`);
  return Promise.all(
    preferenceTypes.map(async (preferenceType) => {
      await getPlaylist(user1, user2, preferenceType);
    }),
  ).then(() => {
    console.timeEnd(`Preloading playlists for ${user1.id} and ${user2.id}`);
  }); // Do nothing. The .then() is necessary to return a Promise<void> instead of Promise<void[]>
}

/**
 * This function retrieves a playlist for two users based on their shared music preferences.
 *
 * @param {UserWithId} user1 - The first user.
 * @param {UserWithId} user2 - The second user.
 * @param {PreferenceType} preferenceType - The type of music preference to consider when
 * generating the playlist.
 *
 * @returns {Promise<Playlist>} A Promise that resolves to a Playlist object. The Playlist
 * object contains tracks that match the users' shared music preferences.
 *
 * @throws {Error} If there is an error retrieving the tracks from the database or the cache.
 */
const getTrackIdsByPreferenceType = async (
  user1: UserWithId,
  user2: UserWithId,
  preferenceType: PreferenceType,
): Promise<LikedTracksQueryResponse> => {
  const likedTrackThreshold = 3;
  const limit = MAX_TRACKS_PER_PLAYLIST;

  switch (preferenceType) {
    case "BOTH":
      return prisma.$queryRaw`SELECT
        trackId,
        sum(
          CASE WHEN userId = ${user1.id} THEN
            listenCount
          ELSE
            0
          END) AS user1Count,
        sum(
          CASE WHEN userId = ${user2.id} THEN
            listenCount
          ELSE
            0
          END) AS user2Count
      FROM (
        SELECT
          userId,
          trackId,
          count(userId) AS listenCount
        FROM
          Listen
        WHERE
          userId = ${user1.id}
          OR userId = ${user2.id}
        GROUP BY
          userId,
          trackId) AS songCounts
      GROUP BY
        trackId
      HAVING
        user1Count >= ${likedTrackThreshold}
        AND user2Count >= ${likedTrackThreshold}
      LIMIT ${limit};` as Promise<LikedTracksQueryResponse>;
    case "USER1-ONLY":
      return prisma.$queryRaw`SELECT
        trackId,
          sum(
            CASE WHEN userId = ${user1.id} THEN
              listenCount
            ELSE
              0
            END) AS user1Count,
          sum(
            CASE WHEN userId = ${user2.id} THEN
              listenCount
            ELSE
              0
            END) AS user2Count
        FROM (
          SELECT
            userId,
            trackId,
            count(userId) AS listenCount
          FROM
            Listen
          WHERE
            userId = ${user1.id}
            OR userId = ${user2.id}
          GROUP BY
            userId,
            trackId) AS songCounts
        GROUP BY
          trackId
        HAVING
          user1Count >= ${likedTrackThreshold}
          AND user2Count < ${likedTrackThreshold}
        LIMIT ${limit};` as Promise<LikedTracksQueryResponse>;
    case "USER2-ONLY":
      return prisma.$queryRaw`SELECT
        trackId,
          sum(
            CASE WHEN userId = ${user1.id} THEN
              listenCount
            ELSE
              0
            END) AS user1Count,
          sum(
            CASE WHEN userId = ${user2.id} THEN
              listenCount
            ELSE
              0
            END) AS user2Count
        FROM (
          SELECT
            userId,
            trackId,
            count(userId) AS listenCount
          FROM
            Listen
          WHERE
            userId = ${user1.id}
            OR userId = ${user2.id}
          GROUP BY
            userId,
            trackId) AS songCounts
        GROUP BY
          trackId
        HAVING
          user1Count < ${likedTrackThreshold}
          AND user2Count >= ${likedTrackThreshold}
        LIMIT ${limit};` as Promise<LikedTracksQueryResponse>;
    default:
      throw new Error("Invalid preference type");
  }
};
