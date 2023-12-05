import { Artist as PrismaArtist, PrismaClient } from "@prisma/client";
import { clearEntireDatabase } from "../../utils/test.utils";

const prisma = new PrismaClient();

const EXAMPLE_ARTISTS = [
  {
    mbid: "f0410667-a245-494b-887b-a81ba45d783d",
    name: "Chris James",
  },
  {
    mbid: "6925db17-f35e-42f3-a4eb-84ee6bf5d4b0",
    name: "Olivia Rodrigo",
  },
  {
    mbid: "f925db17-f353-42f3-a4eb-84ee6bf5d4b1",
    name: "Tame Impala",
  },
];

describe("Prisma Music Operations", () => {
  beforeAll(async () => {
    await clearEntireDatabase();
  });

  describe("Save Artists", () => {
    it("it can save a single artist", async () => {
      const artist = await prisma.artist.create({
        data: EXAMPLE_ARTISTS[0],
      });

      expect(artist.mbid).toEqual(EXAMPLE_ARTISTS[0].mbid);
      expect(artist.id).toBeDefined();
      expect(artist.createdAt).toBeDefined();
      expect(artist.updatedAt).toBeDefined();
    });

    it("it can save multiple artists", async () => {
      const artists = await prisma.artist.createMany({
        data: [EXAMPLE_ARTISTS[1], EXAMPLE_ARTISTS[2]],
        skipDuplicates: true,
      });

      expect(artists.count).toEqual(2);
    });

    it('it skips duplicate artists when "skipDuplicates" is true', async () => {
      const artists = await prisma.artist.createMany({
        data: [EXAMPLE_ARTISTS[1], EXAMPLE_ARTISTS[2]],
        skipDuplicates: true,
      });

      expect(artists.count).toEqual(0);
    });
  });
});
