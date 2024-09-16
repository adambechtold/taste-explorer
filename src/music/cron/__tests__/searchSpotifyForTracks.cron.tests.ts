import { PrismaClient } from "@prisma/client";
import { storeTrackForSpotifyLookup } from "../../music.service";
import { convertPrismaTrackAndArtistsToTrack } from "../../music.utils";
import { populateWithTracks } from "../../testingUtils/music.test.utils";
import { clearEntireDatabase } from "../../../utils/test.utils";
import { Track } from "../../music.types";

import * as SearchSpotify from "../searchSpotifyForTracks.cron";

const prisma = new PrismaClient({ log: ["error"] });

describe("Search Spotify for Tracks", () => {
  describe("get next query to execute", () => {
    describe("Given: There are no queries in the queue", () => {
      beforeEach(async () => {
        await prisma.spotifyTrackSearchQueue.deleteMany({});
      });

      it("returns null", async () => {
        const result = await SearchSpotify.getNextQueryToExecute();

        expect(result).toBeNull();
      });
    });

    describe("Given: There are queries in the queue", () => {
      beforeEach(async () => {
        await prisma.spotifyTrackSearchQueue.deleteMany({});
        await populateWithSpotifyTrackSearches(2);
      });

      it("picks the oldest query, not yet searched", async () => {
        const oldestQuery = await prisma.spotifyTrackSearchQueue.findFirst({
          orderBy: {
            createdAt: "asc",
          },
          where: {
            searchedAt: null,
          },
        });
        const result = await SearchSpotify.getNextQueryToExecute();

        expect(result).not.toBeNull();
        expect(result?.searchedAt).toBeNull();
        expect(result?.id).toEqual(oldestQuery?.id);

        await prisma.spotifyTrackSearchQueue.update({
          where: { id: result?.id },
          data: { searchedAt: new Date() },
        });

        const nextResult = await SearchSpotify.getNextQueryToExecute();
        expect(nextResult).not.toBeNull();
        expect(nextResult?.searchedAt).toBeNull();
        expect(nextResult?.id).not.toEqual(result?.id);
        expect(nextResult?.isBeingSearched).toBe(true);
      });
    });
  });

  describe("update query status after search", () => {
    describe("Given: there are queries in the queue and tracks", () => {
      beforeEach(async () => {
        await prisma.spotifyTrackSearchQueue.deleteMany({});
        await prisma.artist.deleteMany({});
        await prisma.track.deleteMany({});
        await populateWithTracks();
        await populateWithSpotifyTrackSearches(2);
      });

      it("updates the query status", async () => {
        const query = await prisma.spotifyTrackSearchQueue.findFirst({
          where: {
            searchedAt: null,
          },
        });

        if (!query) {
          throw new Error("Query not found");
        }

        const prismaTrack = await prisma.track.findFirst({
          include: {
            artists: true,
          },
        });

        if (!prismaTrack) {
          throw new Error("Track not found");
        }

        const track = convertPrismaTrackAndArtistsToTrack(
          prismaTrack,
          prismaTrack.artists,
        );

        await SearchSpotify.updateQueryStatusAfterSearch(query, track);

        const updatedQuery = await prisma.spotifyTrackSearchQueue.findFirst({
          where: {
            id: query?.id,
          },
        });

        expect(updatedQuery?.isBeingSearched).toBe(false);
        expect(updatedQuery?.searchedAt).not.toBeNull();
        expect(updatedQuery?.trackId).toEqual(track?.id);
      });
    });
  });

  describe("mark all spotify searches as not being searched", () => {
    describe("Given: there are queries in the queue and some are marked as being searched", () => {
      beforeEach(async () => {
        await prisma.spotifyTrackSearchQueue.deleteMany({});
        await populateWithSpotifyTrackSearches(2);
      });

      it("marks all queries as not being searched", async () => {
        await SearchSpotify.markAllSpotifySearchesAsNotBeingSearched();

        const queries = await prisma.spotifyTrackSearchQueue.findMany();

        queries.forEach((query) => {
          expect(query.isBeingSearched).toBe(false);
        });
      });
    });
  });

  describe("store or return track", () => {
    describe("Given: there are tracks and artists in the database", () => {
      beforeEach(async () => {
        await clearEntireDatabase();
        await populateWithTracks();
      });

      it("does not add track if that track already exists", async () => {
        const existingPrismaTrack = await prisma.track.findFirst({
          include: {
            artists: true,
          },
        });
        const [previousTrackCount, previousArtistCount] = await Promise.all([
          prisma.track.count(),
          prisma.artist.count(),
        ]);

        if (!existingPrismaTrack) {
          throw new Error("Track not found");
        }

        const existingTrack = convertPrismaTrackAndArtistsToTrack(
          existingPrismaTrack,
          existingPrismaTrack.artists,
        );

        const returnedTrack =
          await SearchSpotify.storeOrReturnTrack(existingTrack);
        const [newTrackCount, newArtistCount] = await Promise.all([
          prisma.track.count(),
          prisma.artist.count(),
        ]);

        expect(returnedTrack).toBeDefined();
        expect(returnedTrack?.id).toEqual(existingTrack?.id);
        expect(newTrackCount).toEqual(previousTrackCount);
        expect(newArtistCount).toEqual(previousArtistCount);
      });

      it("it does not add a track, as long as the spotify id is the same", async () => {
        const existingTrack = await prisma.track.findFirst({
          include: {
            artists: true,
          },
        });

        const differentArtist = await prisma.artist.findFirst({
          where: {
            id: {
              not: existingTrack?.artists[0].id,
            },
          },
        });

        const [previousTrackCount, previousArtistCount] = await Promise.all([
          prisma.track.count(),
          prisma.artist.count(),
        ]);

        if (!existingTrack) {
          throw new Error("Track not found");
        }
        if (!differentArtist) {
          throw new Error(
            "This test requires the database to have more artists.",
          );
        }

        const track = convertPrismaTrackAndArtistsToTrack(
          existingTrack,
          existingTrack.artists,
        );

        // this will convert the prismaArtist to a artist.
        // This is messy, but good enough for now
        const trackWithDifferentArtist = convertPrismaTrackAndArtistsToTrack(
          existingTrack,
          [differentArtist],
        );

        track.name = "Unique name for testing searchSpotifyForTracks";
        track.mbid = "Unique mbid for testing searchSpotifyForTracks";
        track.artists = trackWithDifferentArtist.artists;

        const returnedTrack = await SearchSpotify.storeOrReturnTrack(track);

        const [newTrackCount, newArtistCount] = await Promise.all([
          prisma.track.count(),
          prisma.artist.count(),
        ]);

        expect(returnedTrack).toBeDefined();
        expect(returnedTrack?.id).toEqual(existingTrack.id);
        expect(newTrackCount).toEqual(previousTrackCount);
        expect(newArtistCount).toEqual(previousArtistCount);
      });

      it("adds a track if it does not exist and will add new artists", async () => {
        const [previousTrackCount, previousArtistCount] = await Promise.all([
          prisma.track.count(),
          prisma.artist.count(),
        ]);

        const existingArtist = await prisma.artist.findFirst();

        if (!existingArtist) {
          throw new Error("Artist not found");
        }

        const track: Track = {
          name: "Unique name for testing searchSpotifyForTracks",
          mbid: "Unique mbid for testing searchSpotifyForTracks",
          spotifyId: "Unique spotifyId for testing searchSpotifyForTracks",
          artists: [
            {
              name: existingArtist.name,
              spotifyId: "Unique spotifyId for testing searchSpotifyForTracks",
            },
          ],
        };

        const returnedTrack = await SearchSpotify.storeOrReturnTrack(track);

        const [newTrackCount, newArtistCount] = await Promise.all([
          prisma.track.count(),
          prisma.artist.count(),
        ]);

        expect(returnedTrack).toBeDefined();
        expect(newTrackCount).toEqual(previousTrackCount + 1);
        expect(newArtistCount).toEqual(previousArtistCount + 1);
      });

      it("adds a track if it does not exist, but won't duplicate existing artists", async () => {
        const [previousTrackCount, previousArtistCount] = await Promise.all([
          prisma.track.count(),
          prisma.artist.count(),
        ]);

        const existingArtist = await prisma.artist.findFirst();

        if (!existingArtist) {
          throw new Error("Artist not found");
        }

        const track: Track = {
          name: "Unique name for testing searchSpotifyForTracks",
          mbid: "Unique mbid for testing searchSpotifyForTracks",
          spotifyId: "Unique spotifyId for testing searchSpotifyForTracks",
          artists: [
            {
              name: existingArtist.name,
              spotifyId: existingArtist.spotifyId,
            },
          ],
        };

        const returnedTrack = await SearchSpotify.storeOrReturnTrack(track);

        const [newTrackCount, newArtistCount] = await Promise.all([
          prisma.track.count(),
          prisma.artist.count(),
        ]);

        expect(returnedTrack).toBeDefined();
        expect(newTrackCount).toEqual(previousTrackCount + 1);
        expect(newArtistCount).toEqual(previousArtistCount);
      });
    });
  });
});

/**
 * Populates the store with Spotify track searches for testing purposes.
 * It stores three tracks with their respective artists.
 *
 * @async
 * @function
 * @returns {Promise<void>} A promise that resolves when all tracks have been stored.
 */
async function populateWithSpotifyTrackSearches(
  numTracks: number,
): Promise<void> {
  const tracks = Array.from({ length: numTracks }, (_, i) => {
    return { trackName: `Test ${i + 1}`, artistName: `Test Artist ${i + 1}` };
  });

  await Promise.all(
    tracks.map(async ({ trackName, artistName }) =>
      storeTrackForSpotifyLookup(trackName, artistName),
    ),
  );
}
