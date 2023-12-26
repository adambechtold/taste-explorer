import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { TooManyRequestsError } from "../../errors/errors.types";
import { TrackWithId } from "../music.types";
import * as MusicService from "../music.service";
import { convertPrismaTrackAndArtistsToTrack } from "../music.utils";

import { pauseTask } from "../../utils/cron.utils";

const prisma = new PrismaClient({ log: ["error"] });

console.log("schedule Research Track Features to run 10 seconds");
const addFeaturesToTracksTask = cron.schedule(
  "*/10 * * * * *",
  addFeaturesToTracks
);

async function addFeaturesToTracks() {
  const tracks = await getNextTracksToResearch();
  console.log(
    "researching tracks",
    tracks.map((track) => track.spotifyId)
  );

  if (tracks.length === 0) {
    console.log("no more tracks to research");
    pauseTask(addFeaturesToTracksTask, 60 * 5); // pause for 5 minutes
    return;
  }

  let tracksWithFeatures: TrackWithId[] = [];
  try {
    tracksWithFeatures = await MusicService.addFeaturesToTracks(tracks);
  } catch (error: any) {
    if (error instanceof TooManyRequestsError) {
      const retryAfter = error.retryAfter ? error.retryAfter : 5 * 60;
      console.log(
        `...too many requests, pausing research task for ${retryAfter} seconds`
      );
      pauseTask(addFeaturesToTracksTask, retryAfter);
      return;
    }
    console.log("Something went wrong. Stopping Task.");
    console.error(error);
    addFeaturesToTracksTask.stop();
  }

  const { totalTracks, tracksWithFeatures: numTracksWithFeatures } =
    await getCoverage();

  console.log("============================================================");
  console.log(`Added features to ${tracksWithFeatures.length} tracks`);
  console.table({
    "Total Number of Tracks:": totalTracks,
    "Tracks With Features": numTracksWithFeatures,
    "Percent Coverage": `${(
      (numTracksWithFeatures / totalTracks) *
      100
    ).toFixed(4)}%`,
  });
  console.log("============================================================");
}

async function getCoverage() {
  const [totalTracks, tracksWithFeatures] = await Promise.all([
    prisma.track.count(),
    prisma.track.count({
      where: {
        acousticness: { not: null },
      },
    }),
  ]);

  return {
    totalTracks,
    tracksWithFeatures,
  };
}

// TODO: Adjust this to prioritize the Tracks that have been listened to the most
export async function getNextTracksToResearch(): Promise<TrackWithId[]> {
  const trackIds = (await prisma.$queryRaw`
  SELECT Track.id, spotifyId, count(Listen.id) AS listenCount 
  FROM Track
    JOIN Listen ON Listen.trackId = Track.id
  WHERE 
    Track.featuresAnalyzedAt IS NULL
    AND 
      (Track.acousticness IS NULL
      OR Track.danceability IS NULL
      OR Track.energy IS NULL
      OR Track.instrumentalness IS NULL
      OR Track.liveness IS NULL
      OR Track.loudness IS NULL
      OR Track.speechiness IS NULL
      OR Track.valence IS NULL)
  GROUP BY Track.id, spotifyId
  ORDER BY listenCount DESC
  LIMIT 100;
  `) as {
    id: number;
    spotifyId: string;
    listenCount: number;
  }[];

  const prismaTracks = await prisma.track.findMany({
    where: {
      id: { in: trackIds.map((track) => track.id) },
    },
  });

  return prismaTracks.map((prismaTrack) =>
    convertPrismaTrackAndArtistsToTrack(prismaTrack, [])
  );
}
