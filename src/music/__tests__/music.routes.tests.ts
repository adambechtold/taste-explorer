import { Listen, PrismaClient } from "@prisma/client";
import createServer from "../../utils/server";
import supertest from "supertest";
import { clearEntireDatabase } from "../../utils/test.utils";
import { createUserByLastfmUsername } from "../../users/users.service";
import {
  UserWithId,
  UserWithLastfmAccountAndId,
} from "../../users/users.types";
import { LastfmListen } from "../../lastfm/lastfm.types";
import { storeListenBatch } from "../../lastfm/lastfm.storage";

const app = createServer();
const prisma = new PrismaClient();

/** Test Music Routes
 * Get Playlist
 * - [x] Can Get Playlist
 * - [x] Playlists are different based on preference type
 * - [x] Users must be different
 * - [x] User Ids must be valid
 * - [x] Users must exist
 */

describe("Music Routes", () => {
  let consoleError = jest
    .spyOn(global.console, "error")
    .mockImplementation(() => {});

  beforeAll(async () => {
    await clearEntireDatabase();
  });

  afterAll(async () => {
    // restore console.error
    consoleError.mockRestore();

    await clearEntireDatabase();
  });

  afterEach(() => {
    consoleError.mockClear();
  });

  describe("Get Playlist Routes", () => {
    describe("Given: there are users with listens", () => {
      let user1: UserWithId;
      let user2: UserWithId;

      beforeAll(async () => {
        await clearEntireDatabase();

        user1 = await createUserByLastfmUsername("atomicGravy");
        user2 = await createUserByLastfmUsername("mathwho");

        if (!user1.lastfmAccount || !user2.lastfmAccount) {
          throw new Error("Could not create test users");
        }

        await saveExampleListens(
          user1 as UserWithLastfmAccountAndId,
          user2 as UserWithLastfmAccountAndId
        );
      });

      afterAll(async () => {
        await clearEntireDatabase();
      });

      it("it should return 404 if the user requested doesn't exist", async () => {
        await supertest(app)
          .get(`/api/music/playlists`)
          .query({
            userId1: user1.id,
            userId2: user2.id + 1,
            preferenceType: "BOTH",
          })
          .expect(404);
      });

      it("it should return 400 if the user ids are the same", async () => {
        await supertest(app)
          .get(`/api/music/playlists`)
          .query({
            userId1: user1.id,
            userId2: user1.id,
            preferenceType: "BOTH",
          })
          .expect(400);
      });

      it("it should return 400 if the user ids are invalid", async () => {
        await supertest(app)
          .get(`/api/music/playlists`)
          .query({
            userId1: "invalidId",
            userId2: user2.id,
            preferenceType: "BOTH",
          })
          .expect(400);
        await supertest(app)
          .get(`/api/music/playlists`)
          .query({
            userId1: user1.id,
            userId2: "invalidId",
            preferenceType: "BOTH",
          })
          .expect(400);
      });

      it("it should return 400 if the preference type is invalid", async () => {
        await supertest(app)
          .get(`/api/music/playlists`)
          .query({
            userId1: user1.id,
            userId2: user2.id,
            preferenceType: "INVALID",
          })
          .expect(400);
      });

      it('it should return 200 and a playlist that both like if preference type is "BOTH"', async () => {
        const response = await supertest(app)
          .get(`/api/music/playlists`)
          .query({
            userId1: user1.id,
            userId2: user2.id,
            preferenceType: "BOTH",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("tracks");
        expect(response.body.tracks).toHaveProperty("items");
        expect(response.body.tracks.items.length).toBe(1);
        expect(response.body.tracks.items[0]).toHaveProperty(
          "name",
          "Both Like"
        );
      });

      it('it should return 200 and a playlist that only user 1 likes if preference type is "USER1-ONLY"', async () => {
        const response = await supertest(app)
          .get(`/api/music/playlists`)
          .query({
            userId1: user1.id,
            userId2: user2.id,
            preferenceType: "USER1-ONLY",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("tracks");
        expect(response.body.tracks).toHaveProperty("items");
        expect(response.body.tracks.items.length).toBe(1);
        expect(response.body.tracks.items[0]).toHaveProperty(
          "name",
          "User 1 Only"
        );
      });

      it('it should return 200 and a playlist that only user 2 likes if preference type is "USER2-ONLY"', async () => {
        const response = await supertest(app)
          .get(`/api/music/playlists`)
          .query({
            userId1: user1.id,
            userId2: user2.id,
            preferenceType: "USER2-ONLY",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("tracks");
        expect(response.body.tracks).toHaveProperty("items");
        expect(response.body.tracks.items.length).toBe(1);
        expect(response.body.tracks.items[0]).toHaveProperty(
          "name",
          "User 2 Only"
        );
        expect(response.body.tracks.items[0]).toHaveProperty("artists");
        expect(response.body.tracks.items[0].artists[0]).toHaveProperty(
          "name",
          "Artist1"
        );
      });
    });
  });
});

async function saveExampleListens(
  user1: UserWithLastfmAccountAndId,
  user2: UserWithLastfmAccountAndId
) {
  const artist = await prisma.artist.create({
    data: {
      name: "Artist1",
      spotifyId: "spotifyId-artist",
    },
  });

  const [trackBothLike, trackUser1Only, trackUser2Only] = await Promise.all([
    prisma.track.create({
      data: {
        name: "Both Like",
        spotifyId: "spotifyId-bothLike",
        artists: {
          connect: {
            id: artist.id,
          },
        },
      },
    }),
    prisma.track.create({
      data: {
        name: "User 1 Only",
        spotifyId: "spotifyId-user1Only",
        artists: {
          connect: {
            id: artist.id,
          },
        },
      },
    }),
    prisma.track.create({
      data: {
        name: "User 2 Only",
        spotifyId: "spotifyId-user2Only",
        artists: {
          connect: {
            id: artist.id,
          },
        },
      },
    }),
  ]);

  return Promise.all([
    storeExampleListen(user1, trackBothLike.id, new Date(1)),
    storeExampleListen(user1, trackBothLike.id, new Date(2)),
    storeExampleListen(user1, trackBothLike.id, new Date(3)),
    storeExampleListen(user2, trackBothLike.id, new Date(4)),
    storeExampleListen(user2, trackBothLike.id, new Date(5)),
    storeExampleListen(user2, trackBothLike.id, new Date(6)),
    // - Only User 1 likes this
    storeExampleListen(user1, trackUser1Only.id, new Date(7)),
    storeExampleListen(user1, trackUser1Only.id, new Date(8)),
    storeExampleListen(user1, trackUser1Only.id, new Date(9)),
    storeExampleListen(user1, trackUser1Only.id, new Date(10)),
    // - Only User 2 likes this, but
    storeExampleListen(user2, trackUser2Only.id, new Date(11)),
    storeExampleListen(user2, trackUser2Only.id, new Date(12)),
    storeExampleListen(user2, trackUser2Only.id, new Date(13)),
    storeExampleListen(user1, trackUser2Only.id, new Date(13)),
  ]);
}

const storeExampleListen = async (
  user: UserWithLastfmAccountAndId,
  trackId: number,
  date: Date
): Promise<Listen> => {
  return prisma.listen.create({
    data: {
      userId: user.id,
      trackId: trackId,
      listenedAt: date,
    },
  });
};
