import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { PrismaTransactionClient } from "../../utils/prisma.types";
import { log } from "../../utils/log.utils";

import { pauseTask } from "../../utils/cron.utils";

import * as MusicService from "../music.service";
import { Track } from "../music.types";
import { LastfmListen } from "@prisma/client";
import { TooManyRequestsError } from "../../errors/errors.types";

const prisma = new PrismaClient({ log: ["error"] });
const separator = "=".repeat(60);
const showProgress = false;

// uncomment for debugging
// createListensFromLastfmListens();

export async function createListensFromLastfmListens(
  task: cron.ScheduledTask | undefined = undefined
) {
  const nextLastfmListen = await getNextLastfmListenToResearch();
  if (nextLastfmListen === null) {
    log(
      `no more last.fm listens to research. Pausing for 5 minutes. It will run at ${new Date(
        Date.now() + 5 * 60 * 1000
      ).toISOString()}`
    );
    if (task) pauseTask(task, 5 * 60);
    return;
  }

  log(
    "researching lastfm listen id",
    nextLastfmListen.id,
    `track: ${nextLastfmListen.trackName} by ${nextLastfmListen.artistName}`
  );
  let track: Track | null = null;
  try {
    track = await MusicService.getTrackFromLastfmListenId(nextLastfmListen.id);
    await markAnalysisStatus(nextLastfmListen.id, false);
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      const retryAfter = error.retryAfter ? error.retryAfter : 5 * 60;
      log(
        `...too many requests, pausing research task for ${retryAfter} seconds. It will run at ${new Date(
          Date.now() + retryAfter * 1000
        ).toISOString()}}`
      );
      markAnalysisStatus(nextLastfmListen.id, false);
      if (task) pauseTask(task, retryAfter);
      return;
    }

    markAnalysisStatus(nextLastfmListen.id, false);

    if (showProgress) {
      const progress = await getProgress();
      console.log(`
${separator}
Something went wrong while researching lastfm listen id ${nextLastfmListen.id}, ${nextLastfmListen.trackName} by ${nextLastfmListen.artistName}
${error}`);

      console.table(progress);
      console.log(separator);
    }

    return;
  }

  if (showProgress) {
    const progress = await getProgress();

    console.log(`
${separator}
Completed Research for Lastfm Listen Id: ${nextLastfmListen.id}: ${
      nextLastfmListen.trackName
    } by ${nextLastfmListen.artistName}
${track ? "Track Found" : "Track Not Found"}`);
    console.table(progress);
    console.log(separator);
  }
}

async function getProgress() {
  console.time("getProgress");
  // Insight - the slowest part of this is the total count of lastfmListens.
  //           the others are pretty fast
  const [
    numberOfLastfmListens,
    numberOfListens,
    numberOfLastfmListensNotAnalyzed,
  ] = await Promise.all([
    prisma.lastfmListen.count(),
    prisma.listen.count(),
    prisma.lastfmListen.count({
      where: {
        analyzedAt: null,
      },
    }),
  ]);
  console.timeEnd("getProgress");

  return {
    "Total Lastfm Listens": numberOfLastfmListens,
    "Total Listens": numberOfListens,
    "Remaining Lastfm Listens": numberOfLastfmListensNotAnalyzed,
    "Percent of LastfmListens with Listens": `${(
      (numberOfListens / numberOfLastfmListens) *
      100
    ).toFixed(4)}%`,
    "Percent of LastfmListens Analyzed": `${(
      ((numberOfLastfmListens - numberOfLastfmListensNotAnalyzed) /
        numberOfLastfmListens) *
      100
    ).toFixed(4)}%`,
  };
}

const markAnalysisStatus = async (
  lastfmId: number,
  status: boolean,
  tx: PrismaTransactionClient = prisma
) => {
  return await tx.lastfmListen.update({
    where: {
      id: lastfmId,
    },
    data: {
      isBeingAnalyzed: status,
    },
  });
};

// ================== UTILS TO FIND THE NEXT ITEM TO RESEARCH =========================
export async function getNextLastfmListenToResearch() {
  return prisma.$transaction(async (tx) => {
    let nextLastfmListens = (await tx.$queryRaw`
      SELECT 
        * 
      FROM 
        LastfmListen 
      WHERE 
        isBeingAnalyzed = false
        AND analyzedAt IS NULL
      ORDER BY 
        id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED`) as LastfmListen[];

    if (nextLastfmListens.length === 0) {
      return null;
    }

    let nextLastfmListen = nextLastfmListens[0];

    nextLastfmListen = await tx.lastfmListen.update({
      where: {
        id: nextLastfmListen.id,
      },
      data: {
        isBeingAnalyzed: true,
      },
    });

    return nextLastfmListen;
  });
}

export async function getNextLastfmListenToResearchBasedOnFrequencyOfListens() {
  log("get next lastfm listen to research");
  return prisma.$transaction(async (tx) => {
    const lastfmTracks = (await tx.$queryRaw`
      SELECT 
        track,
        min(lastfmId) AS minLastfmId, 
        count(lastfmId) AS listenCount, 
        isBeingAnalyzed
      FROM (
        SELECT 
          Listen.id AS listenId,
          concat(trackName, ' by ', artistName) AS track,
          trackName,
          artistName,
          LastfmListen.id AS lastfmId,
          isBeingAnalyzed
        FROM 
          LastfmListen
        LEFT JOIN Listen ON Listen.lastfmListenId = LastfmListen.id
        WHERE Listen.id IS NULL
        AND
        LastfmListen.analyzedAt IS NULL
        AND
        LastfmListen.isBeingAnalyzed = FALSE
      ) AS tracksWithoutListens
    GROUP BY 
      track 
    ORDER BY 
      listenCount DESC,
      minLastfmId ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED`) as {
      listenId: number;
      track: string;
      minLastfmId: number;
      isBeingAnalyzed: boolean;
    }[];

    if (lastfmTracks.length === 0) {
      return null;
    }

    const lastfmListenId = Number(lastfmTracks[0].minLastfmId);
    log("I'll search for lastfm listen id", lastfmListenId);

    await tx.$executeRaw`UPDATE LastfmListen SET isBeingAnalyzed = true WHERE id = ${Number(
      lastfmListenId
    )}`;

    const lastfmListen = await tx.lastfmListen.findUnique({
      where: {
        id: lastfmListenId,
      },
    });

    if (!lastfmListen) {
      throw new Error(
        `lastfm listen with id ${lastfmTracks[0].minLastfmId} not found`
      );
    }

    return {
      trackName: lastfmListen.trackName,
      artistName: lastfmListen.artistName,
      lastfmId: lastfmListenId,
      isBeingAnalyzed: lastfmListen.isBeingAnalyzed,
    };
  });
}
