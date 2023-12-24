import { PrismaClient } from "@prisma/client";
import cron from "node-cron";
import { triggerUpdateListenHistoryByUserId } from "../users/users.service";
import { getTrackFromLastfmListenId } from "./music.service";
import { Track } from "./music.types";
import { TypedError } from "../errors/errors.types";

const prisma = new PrismaClient();

console.log("scheduling Update Listening History to run every day at 9:00am");
cron.schedule("0 9 * * *", updateListenHistory);
console.log("scheduling Research Next Lastfm Listen to run every second");
const researchListensTask = cron.schedule(
  "*/1 * * * * *",
  researchNextLastfmListen
);

const pauseTask = (task: cron.ScheduledTask, minutes: number) => {
  task.stop();
  setTimeout(() => {
    task.start();
  }, minutes * 60 * 1000);
};

// every day at 9am, update listening history for all users
async function updateListenHistory() {
  console.log("updating listen history for all users");
  const allUserIds = (
    await prisma.user.findMany({
      select: {
        id: true,
      },
    })
  ).map((user) => user.id);

  allUserIds.forEach(async (userId) => {
    const response = await triggerUpdateListenHistoryByUserId(userId);
    console.log(response);
  });
}

// every 10 secondds, research the next lastfm listen
async function researchNextLastfmListen() {
  const nextLastfmListenId = await getNextLastfmListenIdToResearch();
  if (nextLastfmListenId === null) {
    console.log("no more last.fm listens to research");
    return;
  }

  console.log("============================================================");
  console.log("researching lastfm listen id", nextLastfmListenId);
  let track: Track | null = null;
  try {
    await prisma.lastfmListen.update({
      where: {
        id: nextLastfmListenId,
      },
      data: {
        isBeingAnalyzed: true,
      },
    });

    track = await getTrackFromLastfmListenId(nextLastfmListenId);
  } catch (error) {
    if (error instanceof TypedError && error.status === 429) {
      console.log("...too many requests, pausing research task for 5 minutes");
      pauseTask(researchListensTask, 5);
      return;
    }

    console.log("Something went wrong.\n", error);
    console.log("============================================================");
    return;
  }

  await prisma.lastfmListen.update({
    where: {
      id: nextLastfmListenId,
    },
    data: {
      isBeingAnalyzed: false,
    },
  });

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
  Progress:
  ...total lastfm listens:       ${numberOfLastfmListens}
  ...total listens:              ${numberOfListens}
  ...percent coverage:           ${percentComplete}%
  ...# remaining lastfm listens: ${numberOfLastfmListensNotAnalyzed}
============================================================
`);
}

async function getNextLastfmListenIdToResearch(): Promise<number | null> {
  const lastfmTracks = (await prisma.$queryRaw`
    SELECT track, min(lastfmId) AS minLastfmId, count(lastfmId) AS listenCount
    FROM (
      SELECT 
        Listen.id AS listenId,
        concat(trackName, '|', artistName) AS track,
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
    listenCount DESC;`) as {
    track: string;
    minLastfmId: number;
  }[];

  if (lastfmTracks.length === 0) {
    return null;
  }

  return Number(lastfmTracks[0].minLastfmId);
}
