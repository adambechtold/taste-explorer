import { PrismaClient } from "@prisma/client";

import { UserWithId } from "../../users/users.types";
import { Track } from "../music.types";
import { PreferenceType, Playlist } from "./playlists.types";

const prisma = new PrismaClient();

type LikedTracksQueryResponse = [
  {
    songNameAndArtist: string;
    user1Count: number;
    user2Count: number;
  }
];

export async function getPlaylist(
  user1: UserWithId,
  user2: UserWithId,
  preferenceType: PreferenceType
): Promise<Playlist> {
  const result = await queryTracks(user1, user2, preferenceType);

  const likedTracks: Track[] = result.map((track) => {
    return {
      name: track.songNameAndArtist.split(" | by | ")[0],
      artist: {
        name: track.songNameAndArtist.split(" | by | ")[1],
      },
    };
  });

  return {
    tracks: likedTracks,
  };
}

const queryTracks = async (
  user1: UserWithId,
  user2: UserWithId,
  preferenceType: PreferenceType
): Promise<LikedTracksQueryResponse> => {
  const likedTrackThreshold = 3;

  switch (preferenceType) {
    case "BOTH":
      return prisma.$queryRaw`SELECT
      songNameAndArtist,
      sum(CASE WHEN userId = ${user1.id} THEN
        listenCount
      ELSE
        0
      END) AS user1Count,
      sum(CASE WHEN userId = ${user2.id} THEN
        listenCount
      ELSE
        0
      END) AS user2Count
    FROM (
      SELECT
        userId,
        concat(JSON_EXTRACT(trackData, '$.name'), ' | by | ', JSON_EXTRACT(trackData, '$.artist.name')) AS songNameAndArtist,
        count(userId) AS listenCount
      FROM
        LastfmListen
      WHERE
        userId = ${user1.id}
        OR userId = ${user2.id}
      GROUP BY
        userId,
        songNameAndArtist) AS songCounts
        GROUP by songNameAndArtist
        HAVING user1Count >= ${likedTrackThreshold} AND user2Count >= ${likedTrackThreshold};` as Promise<LikedTracksQueryResponse>;
    case "USER1-ONLY":
      return prisma.$queryRaw`SELECT
      songNameAndArtist,
      sum(CASE WHEN userId = ${user1.id} THEN
        listenCount
      ELSE
        0
      END) AS user1Count,
      sum(CASE WHEN userId = ${user2.id} THEN
        listenCount
      ELSE
        0
      END) AS user2Count
    FROM (
      SELECT
        userId,
        concat(JSON_EXTRACT(trackData, '$.name'), ' | by | ', JSON_EXTRACT(trackData, '$.artist.name')) AS songNameAndArtist,
        count(userId) AS listenCount
      FROM
        LastfmListen
      WHERE
        userId = ${user1.id}
        OR userId = ${user2.id}
      GROUP BY
        userId,
        songNameAndArtist) AS songCounts
        GROUP by songNameAndArtist
        HAVING user1Count >= ${likedTrackThreshold} AND user2Count < ${likedTrackThreshold};` as Promise<LikedTracksQueryResponse>;
    case "USER2-ONLY":
      return prisma.$queryRaw`SELECT
      songNameAndArtist,
      sum(CASE WHEN userId = ${user1.id} THEN
        listenCount
      ELSE
        0
      END) AS user1Count,
      sum(CASE WHEN userId = ${user2.id} THEN
        listenCount
      ELSE
        0
      END) AS user2Count
    FROM (
      SELECT
        userId,
        concat(JSON_EXTRACT(trackData, '$.name'), ' | by | ', JSON_EXTRACT(trackData, '$.artist.name')) AS songNameAndArtist,
        count(userId) AS listenCount
      FROM
        LastfmListen
      WHERE
        userId = ${user1.id}
        OR userId = ${user2.id}
      GROUP BY
        userId,
        songNameAndArtist) AS songCounts
        GROUP by songNameAndArtist
        HAVING user1Count < ${likedTrackThreshold} AND user2Count >= ${likedTrackThreshold};` as Promise<LikedTracksQueryResponse>;
    default:
      throw new Error("Invalid preference type");
  }
};
