import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

import { pauseTask } from "../../utils/cron.utils";

import * as MusicService from "../music.service";
import { Track } from "../music.types";
import { TooManyRequestsError } from "../../errors/errors.types";

const prisma = new PrismaClient({ log: ["error"] });

console.log("Research Next Lastfm Listen will run every second");
const researchListensTask = cron.schedule(
  "*/1 * * * * *",
  createListensFromLastfmListens
);

async function createListensFromLastfmListens() {
  const nextLastfmListen = await getNextLastfmListenToResearch();
  if (nextLastfmListen === null) {
    console.log("no more last.fm listens to research");
    return;
  }

  console.log(
    "researching lastfm listen id",
    nextLastfmListen.lastfmId,
    "track: ",
    nextLastfmListen.track
  );
  let track: Track | null = null;
  try {
    await markAnalysisStatus(nextLastfmListen.lastfmId, true);

    track = await MusicService.getTrackFromLastfmListenId(
      nextLastfmListen.lastfmId
    );
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      const retryAfter = error.retryAfter ? error.retryAfter : 5 * 60;
      console.log(
        `...too many requests, pausing research task for ${retryAfter} seconds`
      );
      markAnalysisStatus(nextLastfmListen.lastfmId, false);
      pauseTask(researchListensTask, retryAfter);
      return;
    }

    console.log(`
============================================================
Something went wrong while researching lastfm listen id ${nextLastfmListen.lastfmId}, ${nextLastfmListen.track}
${error}
============================================================`);

    markAnalysisStatus(nextLastfmListen.lastfmId, false);
    return;
  }

  await markAnalysisStatus(nextLastfmListen.lastfmId, true);

  if (!track) {
    console.log("...track not found");
  } else {
    console.log("...track found");
  }

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
  const percentComplete = (
    (numberOfListens / numberOfLastfmListens) *
    100
  ).toFixed(4);

  console.log(`
============================================================
Completed Research for Lastfm Listen Id: ${nextLastfmListen.lastfmId}: ${
    nextLastfmListen.track
  }
${track ? "Track Found" : "Track Not Found"}

  Progress:
  ...total lastfm listens:       ${numberOfLastfmListens}
  ...total listens:              ${numberOfListens}
  ...percent coverage:           ${percentComplete}%
  ...# remaining lastfm listens: ${numberOfLastfmListensNotAnalyzed}
============================================================
`);
}

const markAnalysisStatus = async (lastfmId: number, status: boolean) => {
  return await prisma.lastfmListen.update({
    where: {
      id: lastfmId,
    },
    data: {
      isBeingAnalyzed: status,
    },
  });
};

// ================== UTILS TO FIND THE NEXT ITEM TO RESEARCH =========================
async function getNextLastfmListenToResearch() {
  const lastfmTracks = (await prisma.$queryRaw`
    SELECT track, min(lastfmId) AS minLastfmId, count(lastfmId) AS listenCount
    FROM (
      SELECT 
        Listen.id AS listenId,
        concat(trackName, ' by ', artistName) AS track,
        LastfmListen.id AS lastfmId
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
    minLastfmId ASC;`) as {
    listenId: number;
    track: string;
    minLastfmId: number;
  }[];

  if (lastfmTracks.length === 0) {
    return null;
  }

  return {
    listenId: Number(lastfmTracks[0].listenId),
    track: lastfmTracks[0].track,
    lastfmId: Number(lastfmTracks[0].minLastfmId),
  };
}
