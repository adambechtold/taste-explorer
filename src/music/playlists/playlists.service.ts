import { PrismaClient } from "@prisma/client";

import { UserWithId } from "../../users/users.types";
import { TrackWithId } from "../music.types";
import { PreferenceType, Playlist } from "./playlists.types";

const prisma = new PrismaClient();

type LikedTracksQueryResponse = {
  trackId: number;
  user1Count: number;
  user2Count: number;
}[];

export async function getPlaylist(
  user1: UserWithId,
  user2: UserWithId,
  preferenceType: PreferenceType
): Promise<Playlist> {
  const tracksMatchingPreferenceType = await getTrackIdsByPreferenceType(
    user1,
    user2,
    preferenceType
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

  return {
    tracks: { items: tracks },
  };
}

const getTrackIdsByPreferenceType = async (
  user1: UserWithId,
  user2: UserWithId,
  preferenceType: PreferenceType
): Promise<LikedTracksQueryResponse> => {
  const likedTrackThreshold = 3;
  const limit = 50;

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
