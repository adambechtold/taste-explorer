import cron from "node-cron";
import { LastfmListen, PrismaClient } from "@prisma/client";
import { PrismaTransactionClient } from "../../utils/prisma.types";
import { Logger } from "../../utils/log.utils";

import { pauseTask } from "../../utils/cron.utils";

import * as MusicService from "../music.service";
import { TrackWithId } from "../music.types";
import { TooManyRequestsError } from "../../errors/errors.types";

const logger = new Logger("createListens");
const prisma = new PrismaClient({ log: ["error"] });

// uncomment for debugging
//createListensFromLastfmListens();

export async function createListensFromLastfmListens(
  task: cron.ScheduledTask | undefined = undefined
) {
  // 1 - get the next last.fm listens to research
  const nextLastfmListens = await getNextLastfmListensToResearch();
  if (nextLastfmListens.length === 0) {
    logger.log(
      `no more last.fm listens to research. Pausing for 5 minutes. It will run at ${new Date(
        Date.now() + 5 * 60 * 1000
      ).toISOString()}`
    );
    if (task) pauseTask(task, 5 * 60);
    return;
  }

  // 2 - get the track from the database
  const { trackName, artistName } = nextLastfmListens[0];

  logger.log(
    `research ${nextLastfmListens.length} last.fm listens for ${trackName} by ${artistName}`
  );

  let track: TrackWithId | null = null;
  try {
    track = await MusicService.getTrackByNameAndArtistName(
      trackName,
      artistName
    );
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      const retryAfter = error.retryAfter ? error.retryAfter : 5 * 60;
      logger.log(
        `...too many requests, pausing research task for ${retryAfter} seconds. It will run at ${new Date(
          Date.now() + retryAfter * 1000
        ).toISOString()}}`
      );
      if (task) pauseTask(task, retryAfter);
      return;
    } else {
      throw error;
    }
  }

  // 3 - link track to the last.fm listens
  if (track) {
    await MusicService.linkLastfmListensToTrackById(
      nextLastfmListens,
      track.id,
      false
    );
  } else {
    logger.log(
      `no track found for ${trackName} by ${artistName} in the database. Storing in spotify research queue.`
    );

    await MusicService.storeTrackForSpotifyLookup(trackName, artistName);
  }

  // 4 - mark the analysis time
  await markAnalyzedAt(
    nextLastfmListens.map((l) => l.id),
    null
  );

  // 5 - mark the last.fm listens as analyzed
  await markIsBeingAnalyzed(
    nextLastfmListens.map((l) => l.id),
    false
  );
}

// ================== UTILS TO FIND THE NEXT ITEM TO RESEARCH =========================
/**
 * Retrieves the next last.fm listens to research from the database.
 *
 * We get the oldest last.fm listen that have not been analyzed yet and then all of the other last.fm listens
 * with the same trackName and artistName that have not been analyzed yet.
 *
 * @returns {Promise<LastfmListen[] | null>} A promise that resolves with the next last.fm listen to research, or null if there are no more last.fm listens to research.
 * @throws {Prisma.PrismaClientKnownRequestError} If the database query fails.
 */
export async function getNextLastfmListensToResearch(): Promise<
  LastfmListen[]
> {
  return prisma.$transaction(async (tx) => {
    const nextLastfmListen = await tx.lastfmListen.findFirst({
      where: {
        isBeingAnalyzed: false,
        analyzedAt: null,
      },
      orderBy: {
        id: "asc",
      },
    });

    const nextLastfmListens = await tx.$queryRaw<LastfmListen[]>`
      SELECT 
        * 
      FROM 
        LastfmListen
      WHERE 
        trackName = ${nextLastfmListen?.trackName}
        AND artistName = ${nextLastfmListen?.artistName}
        AND isBeingAnalyzed = false
        AND analyzedAt IS NULL
      FOR UPDATE SKIP LOCKED`;

    // mark the next lastfm listens as being analyzed
    await markIsBeingAnalyzed(
      nextLastfmListens.map((l) => l.id),
      true,
      tx
    );

    return nextLastfmListens;
  });
}

/**
 * This asynchronous function updates the analysis status of Last.fm listens.
 *
 * @param {number[]} lastfmIds - The ID of the Last.fm listen.
 * @param {boolean} status - The new analysis status to be set.
 * @param {PrismaTransactionClient} [tx=prisma] - The Prisma Transaction Client, default is `prisma`.
 * @returns {Promise<LastfmListen[]>} - A promise that resolves to the updated Last.fm listens.
 */
const markIsBeingAnalyzed = async (
  lastfmIds: number[],
  status: boolean,
  tx: PrismaTransactionClient = prisma
) => {
  return await tx.lastfmListen.updateMany({
    where: {
      id: {
        in: lastfmIds,
      },
    },
    data: {
      isBeingAnalyzed: status,
    },
  });
};

/**
 * Updates the 'analyzedAt' field for multiple Last.fm listens.
 *
 * @param {number[]} lastfmListenIds - An array of Last.fm listen IDs.
 * @param {Date | null} timestamp - The timestamp to set as the 'analyzedAt' value. If null, the current date and time is used.
 * @param {PrismaTransactionClient} [tx=prisma] - The Prisma Transaction Client, default is `prisma`.
 * @returns {Promise<Prisma.BatchPayload>} - A promise that resolves to a Prisma BatchPayload object representing the result of the update operation.
 */
const markAnalyzedAt = async (
  lastfmListenIds: number[],
  timestamp: Date | null,
  tx: PrismaTransactionClient = prisma
) => {
  const analyzedAt = timestamp ? timestamp : new Date();
  return await tx.lastfmListen.updateMany({
    where: {
      id: { in: lastfmListenIds },
    },
    data: {
      analyzedAt,
    },
  });
};

/**
 * Updates all last.fm listens in the database to set their `isBeingAnalyzed` field to false.
 * This function is typically used to reset the updating status of all last.fm listens.
 *
 * @returns {Promise<void>} A promise that resolves when the update operation is complete.
 * @throws {Prisma.PrismaClientKnownRequestError} If the update operation fails.
 */
export async function markAllLastfmListensAsNotUpdating() {
  await prisma.lastfmListen.updateMany({
    where: {
      isBeingAnalyzed: true,
    },
    data: {
      isBeingAnalyzed: false,
    },
  });
}
