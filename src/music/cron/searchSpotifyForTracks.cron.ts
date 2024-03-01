import cron from "node-cron";
import { convertPrismaTrackAndArtistsToTrack } from "../music.utils";
import { Logger } from "../../utils/log.utils";
import { linkLastfmListensToTrackById } from "../music.service";
import { PrismaClient, SpotifyTrackSearchQueue } from "@prisma/client";
import {
  getTrack as getSpotifyTrack,
  getAccessToken as getSpotifyAccessToken,
} from "../../spotify/spotify.service";
import { Track, TrackWithId } from "../music.types";

const prisma = new PrismaClient({ log: ["error"] });
const logger = new Logger("searchSpotifyForTracks");

// uncomment this to debug
// searchSpotifyForTracks();

/**
 * Pulls from the query of pending spotify track searches.
 * If a track is found, it is stored in the database and linked to all last.fm listens with the same track name and artist name.
 *
 * @param {cron.ScheduledTask | undefined} [task=undefined] - The cron task that scheduled this function. If provided, the task will be stopped and restarted if no more queries are to be executed.
 * @throws {Error} When no access token is found.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function searchSpotifyForTracks(
  task: cron.ScheduledTask | undefined = undefined
) {
  const nextQuery = await getNextQueryToExecute();

  if (!nextQuery) {
    logger.log("no more queries to execute. Pausing for 10 seconds");
    if (task) {
      task.stop();
      setTimeout(() => {
        task.start();
      }, 10 * 1000);
    }
    return;
  }

  const { trackName, artistName } = nextQuery;
  logger.log(`searching Spotify for ${trackName} by ${artistName}`);
  const accessToken = await getSpotifyAccessToken();

  if (!accessToken) {
    logger.error("No access token found. Check configuration!");
    throw new Error("No access token found. Check configuration!");
  }

  const track = await getSpotifyTrack(accessToken, trackName, artistName);

  if (!track) {
    logger.log(`no track found for ${trackName} by ${artistName} in Spotify`);
  } else {
    // store the track in the database
    logger.log(
      `track found for ${trackName} by ${artistName} in Spotify. Storing in database.`
    );
    const trackWithId = await storeOrReturnTrack(track);

    // link track to all last.fm listens with this track name and artist name
    const listens = await prisma.lastfmListen.findMany({
      where: {
        trackName,
        artistName,
      },
    });
    // concern -  this could be a really large number (~4000)

    const updatedListenCount = await linkLastfmListensToTrackById(
      listens,
      trackWithId.id,
      false
    );
    logger.log(
      `linked ${updatedListenCount.count} last.fm listens to track ${trackName} by ${artistName}`
    );

    // link the track to the query
    await updateQueryStatusAfterSearch(nextQuery, trackWithId);
  }
}

/**
 * This asynchronous function stores a new track in the database or returns an existing one.
 *
 * @param {Track} track - The track to be stored or returned.
 * @returns {Promise<TrackWithId>} A promise that resolves to the stored or existing track, including its ID.
 * @throws {Prisma.PrismaClientKnownRequestError} When a Prisma Client error occurs.
 */
export async function getNextQueryToExecute(): Promise<SpotifyTrackSearchQueue | null> {
  return prisma.$transaction(async (tx) => {
    const query = await tx.$queryRaw<SpotifyTrackSearchQueue[] | null>`
      SELECT * FROM SpotifyTrackSearchQueue
      WHERE searchedAt IS NULL
      ORDER BY createdAt ASC
      LIMIT 1;  
    `;

    if (!query || query.length === 0) {
      return null;
    }

    const nextQuery = await tx.spotifyTrackSearchQueue.update({
      where: { id: query[0].id },
      data: { isBeingSearched: true },
    });

    return nextQuery;
  });
}

/**
 * Stores a new track in the database or returns an existing one.
 *
 * @param {Track} track - The track to be stored or returned.
 * @returns {Promise<TrackWithId>} A promise that resolves to the stored or existing track, including its ID.
 * @throws {Prisma.PrismaClientKnownRequestError} When a Prisma Client error occurs.
 */
// TODO: Test this function
async function storeOrReturnTrack(track: Track): Promise<TrackWithId> {
  const existingTrack = await prisma.track.findFirst({
    where: {
      spotifyId: track.spotifyId,
    },
    include: {
      artists: true,
    },
  });

  if (existingTrack) {
    return convertPrismaTrackAndArtistsToTrack(
      existingTrack,
      existingTrack.artists
    );
  }

  const newArtists = track.artists.map((artist) => ({
    name: artist.name,
    spotifyId: artist.spotifyId,
  }));

  // create artists if they don't exist
  await Promise.all(
    newArtists.map(async (artist) => {
      await prisma.artist.upsert({
        where: { spotifyId: artist.spotifyId },
        update: {},
        create: artist,
      });
    })
  );

  const newTrack = await prisma.track.create({
    data: {
      name: track.name,
      spotifyId: track.spotifyId,
      imageUrl: track.imageUrl,
      artists: {
        connect: newArtists.map((artist) => ({ spotifyId: artist.spotifyId })),
      },
    },
    include: {
      artists: true,
    },
  });

  return convertPrismaTrackAndArtistsToTrack(newTrack, newTrack.artists);
}

/**
 * Updates the status of a query in the SpotifyTrackSearchQueue after a search operation.
 *
 * @param {SpotifyTrackSearchQueue} query - The query whose status is to be updated.
 * @param {TrackWithId | null} track - The track found by the search operation, or null if no track was found.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function updateQueryStatusAfterSearch(
  query: SpotifyTrackSearchQueue,
  track: TrackWithId | null
) {
  await prisma.spotifyTrackSearchQueue.update({
    where: { id: query.id },
    data: {
      searchedAt: new Date(),
      isBeingSearched: false,
      trackId: track?.id || null,
    },
  });
}

/**
 * Updates all entries in the SpotifyTrackSearchQueue, marking them as not being searched.
 *
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function markAllSpotifySearchesAsNotBeingSearched() {
  await prisma.spotifyTrackSearchQueue.updateMany({
    where: {
      isBeingSearched: true,
    },
    data: {
      isBeingSearched: false,
    },
  });
}
