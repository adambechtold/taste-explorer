import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { TooManyRequestsError } from "../../errors/errors.types";
import { TrackWithId } from "../music.types";
import * as MusicService from "../music.service";
import { convertPrismaTrackAndArtistsToTrack } from "../music.utils";
import { Logger } from "../../utils/log.utils";

import { pauseTask } from "../../utils/cron.utils";

const prisma = new PrismaClient({ log: ["error"] });
const logger = new Logger("addFeaturesToTracks");

const SHOW_PROGRESS = false;

/**
 * This function is a task that adds features to tracks in the database.
 * It fetches the next tracks to research, adds features to them using the MusicService, and handles any errors that occur.
 * If there are no more tracks to research, it pauses the task for 5 minutes.
 * If the MusicService throws a TooManyRequestsError, it pauses the task for the duration specified in the error, or 5 minutes if no duration is specified.
 * If any other error occurs, it logs the error and stops the task.
 *
 * @param {cron.ScheduledTask} task - The task that is running this function.
 * @returns {Promise<void>} A promise that resolves when the function has completed.
 * @throws {TooManyRequestsError} If the MusicService throws a TooManyRequestsError.
 */
export async function addFeaturesToTracks(task: cron.ScheduledTask) {
  const tracks = await getNextTracksToResearch();
  logger.log(`researching ${tracks.length} tracks`);

  if (tracks.length === 0) {
    logger.log("no more tracks to research");
    pauseTask(task, 60 * 5); // pause for 5 minutes
    return;
  }

  let tracksWithFeatures: TrackWithId[] = [];
  try {
    tracksWithFeatures = await MusicService.addFeaturesToTracks(tracks);
  } catch (error: any) {
    if (error instanceof TooManyRequestsError) {
      const retryAfter = error.retryAfter ? error.retryAfter : 5 * 60;
      logger.log(
        `...too many requests, pausing research task for ${retryAfter} seconds`,
      );
      pauseTask(task, retryAfter);
      return;
    }
    logger.log("Something went wrong. Stopping Task.");
    logger.error(error);
    task.stop();
  }

  if (SHOW_PROGRESS) {
    const {
      totalTracks,
      tracksWithFeatures: numTracksWithFeatures,
      tracksAnalyzed: numTrackAnalyzed,
    } = await getCoverage();

    logger.log("============================================================");
    logger.log(`Added features to ${tracksWithFeatures.length} tracks`);
    console.table({
      "Total Number of Tracks:": totalTracks,
      "Tracks With Features": numTracksWithFeatures,
      "Percent Coverage with Features": `${(
        (numTracksWithFeatures / totalTracks) *
        100
      ).toFixed(4)}%`,
      "Tracks Analyzed": numTrackAnalyzed,
      "Percent of Tracks Analyzed": `${(
        (numTrackAnalyzed / totalTracks) *
        100
      ).toFixed(4)}%`,
    });
    logger.log("============================================================");
  }
}

/**
 * Retrieves the total number of tracks, the number of tracks with features, and the number of tracks analyzed from the database.
 * This function is used to calculate the coverage of track features and analysis in the database.
 *
 * @returns {Promise<{totalTracks: number, tracksWithFeatures: number, tracksAnalyzed: number}>} A promise that resolves with an object containing the total number of tracks, the number of tracks with features, and the number of tracks analyzed.
 * @throws {Prisma.PrismaClientKnownRequestError} If the query fails.
 */
async function getCoverage() {
  const [totalTracks, tracksWithFeatures, tracksAnalyzed] = await Promise.all([
    prisma.track.count(),
    prisma.track.count({
      where: {
        acousticness: { not: null },
      },
    }),
    prisma.track.count({
      where: {
        featuresAnalyzedAt: { not: null },
      },
    }),
  ]);

  return {
    totalTracks,
    tracksWithFeatures,
    tracksAnalyzed,
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
    convertPrismaTrackAndArtistsToTrack(prismaTrack, []),
  );
}
