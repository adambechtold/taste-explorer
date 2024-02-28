import { PrismaClient } from "@prisma/client";
import { storeTrackForSpotifyLookup } from "../../music.service";

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
  numTracks: number
): Promise<void> {
  const tracks = Array.from({ length: numTracks }, (_, i) => {
    return { trackName: `Test ${i + 1}`, artistName: `Test Artist ${i + 1}` };
  });

  await Promise.all(
    tracks.map(async ({ trackName, artistName }) =>
      storeTrackForSpotifyLookup(trackName, artistName)
    )
  );
}
