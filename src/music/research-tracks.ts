import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// every 10 seconds, hit the url localhost:4000/lastfm-listens/:id/

const numberToResearch = 70000;
const startAtIndex = 33736;

// 1-6 seconds
const getTimeBetweenRequests = () => Math.floor(Math.random() * 200) + 0;

async function getDistinctLastfmTrackIdsNotYetResearched() {
  const lastfmTracks = (await prisma.$queryRaw`
    SELECT track, min(lastfmId) as minLastfmId
    FROM (
      SELECT
        Listen.id AS listenId,
        concat(trackData ->> '$.name', '|', trackData ->> '$.artist.name') AS track,
        LastfmListen.id AS lastfmId
      FROM
        LastfmListen
      LEFT JOIN Listen ON Listen.lastfmListenId = LastfmListen.id
    WHERE
      Listen.id IS NULL
      AND
      LastfmListen.id > ${startAtIndex}
      AND 
      LastfmListen.analyzedAt IS NULL
    ) AS tracksWithoutListens
    GROUP BY
      track
    ORDER BY
      minLastfmId;`) as {
    track: string;
    minLastfmId: number;
  }[];

  return lastfmTracks.map((t) => Number(t.minLastfmId));
}

async function getPercentCoverage(): Promise<number> {
  const [totalListens, totalLastfmListens] = await Promise.all([
    prisma.listen.count(),
    prisma.lastfmListen.count(),
  ]);
  return (totalListens / totalLastfmListens) * 100;
}

async function researchTracks() {
  let lastfmListenIds = await getDistinctLastfmTrackIdsNotYetResearched();

  console.log("starting research for", numberToResearch, "listens.");
  console.log(
    "the lowest listen index is",
    lastfmListenIds[0],
    "and the highest is",
    lastfmListenIds[lastfmListenIds.length - 1],
    ":",
  );

  let numberResearched = 0;

  const makeRequest = async () => {
    // find next track to research
    lastfmListenIds = await getDistinctLastfmTrackIdsNotYetResearched();
    //    let currentIndex = 0;

    //    const currentId = lastfmListenIds[currentIndex];

    try {
      console.log("...researching lastfmListen no:", lastfmListenIds[0]);
      const response = await fetch(
        `http://localhost:4000/api/music/lastfm-listens/${lastfmListenIds[0]}/track`,
      );

      if (!response.ok) {
        console.log("...error fetching:", response.statusText);
      }

      numberResearched++;

      if (numberResearched <= numberToResearch) {
        // schedule the next request
        const timeToNextRequest = getTimeBetweenRequests();
        console.log("......waiting", timeToNextRequest, "ms");
        setTimeout(makeRequest, getTimeBetweenRequests());
        console.log(
          `.........percent coverage: ${(await getPercentCoverage()).toFixed(
            4,
          )}%`,
        );
      } else {
        console.log("Complete!");
      }
    } catch (error) {
      console.error(error);
    }
  };

  makeRequest();
}

researchTracks();
