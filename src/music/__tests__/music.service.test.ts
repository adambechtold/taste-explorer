import { PrismaClient } from "@prisma/client";
import { clearEntireDatabase } from "../../utils/test.utils";
import * as MusicService from "../music.service";
import * as MusicExamples from "../assets/music.listens.examples";
import * as UserService from "../../users/users.service";

const prisma = new PrismaClient();

describe("Music Service", () => {
  describe("Given: the database only contains two users", () => {
    const getListen = MusicExamples.getListen;

    beforeEach(async () => {
      await clearEntireDatabase();
      await Promise.all([
        UserService.storeUser(MusicExamples.USER1),
        UserService.storeUser(MusicExamples.USER2),
      ]);
    });

    describe("Store Listens", () => {
      describe("Store Artists", () => {
        it("it stores all artists", async () => {
          const exampleUser = await prisma.user.findFirst();
          if (!exampleUser)
            throw new Error("No example user found. Review test setup");

          const listens = [
            getListen(
              exampleUser,
              MusicExamples.TRACK1_ART1_ALB1_1,
              new Date(1)
            ),
            getListen(
              exampleUser,
              MusicExamples.TRACK3_ART2_ALB1_1,
              new Date(2)
            ),
          ];
          const response = await MusicService.storeListens(listens);
          const artists = await prisma.artist.findMany();
          expect(response).toHaveProperty("artist.count", 2);
          expect(artists.length).toEqual(2);
        });

        it("it only saves an artist once if the same track is listened two twice", async () => {
          const exampleUser = await prisma.user.findFirst();
          if (!exampleUser)
            throw new Error("No example user found. Review test setup");

          const listens = [
            getListen(
              exampleUser,
              MusicExamples.TRACK1_ART1_ALB1_1,
              new Date(1)
            ),
            getListen(
              exampleUser,
              MusicExamples.TRACK1_ART1_ALB1_1,
              new Date(2)
            ),
          ];
          const response = await MusicService.storeListens(listens);
          const artists = await prisma.artist.findMany();
          expect(response).toHaveProperty("artist.count", 1);
          expect(artists.length).toEqual(1);
        });

        it("it only saves an artist once if the artist is listened to twice with different tracks", async () => {
          const exampleUser = await prisma.user.findFirst();
          if (!exampleUser)
            throw new Error("No example user found. Review test setup");

          const listens = [
            getListen(
              exampleUser,
              MusicExamples.TRACK1_ART1_ALB1_1,
              new Date(1)
            ),
            getListen(
              exampleUser,
              MusicExamples.TRACK2_ART1_ALB1_2,
              new Date(2)
            ),
          ];
          const response = await MusicService.storeListens(listens);
          const artists = await prisma.artist.findMany();
          expect(response).toBeDefined();
          expect(response).toHaveProperty("artist.count", 1);
          expect(artists.length).toEqual(1);
        });
      });

      describe("Store Albums", () => {
        describe("Given: the database is empty", () => {
          it("it stores an album and connects it with an artist", async () => {
            const exampleUser = await prisma.user.findFirst();
            if (!exampleUser)
              throw new Error("No example user found. Review test setup");

            const listens = [
              getListen(
                exampleUser,
                MusicExamples.TRACK1_ART1_ALB1_1,
                new Date(1)
              ),
            ];
            await MusicService.storeListens(listens);
            const albums = await prisma.album.findMany({
              include: { artists: true },
            });
            expect(albums.length).toEqual(1);
            expect(albums[0].artists.length).toEqual(1);
            expect(albums[0].artists[0].mbid).toEqual(
              listens[0].track.artists[0].mbid
            );
          });

          it("it skips duplicate albums if they appear in multiple tracks", async () => {
            const exampleUser = await prisma.user.findFirst();
            if (!exampleUser)
              throw new Error("No example user found. Review test setup");

            const listens = [
              getListen(
                exampleUser,
                MusicExamples.TRACK1_ART1_ALB1_1,
                new Date(1)
              ),
              getListen(
                exampleUser,
                MusicExamples.TRACK2_ART1_ALB1_2,
                new Date(2)
              ),
              getListen(
                exampleUser,
                MusicExamples.TRACK4_ART2_ALB2_1,
                new Date(3)
              ),
            ];
            await MusicService.storeListens(listens);
            const albums = await prisma.album.findMany();
            expect(albums.length).toEqual(2);
          });
        });
      });

      describe("Store Tracks", () => {
        it("it saves a track and connects it with an artist and album", async () => {
          const exampleUser = await prisma.user.findFirst();
          if (!exampleUser)
            throw new Error("No example user found. Review test setup");

          const listens = [
            getListen(
              exampleUser,
              MusicExamples.TRACK1_ART1_ALB1_1,
              new Date(1)
            ),
          ];
          await MusicService.storeListens(listens);
          const tracks = await prisma.track.findMany({
            include: { artists: true, album: true },
          });
          expect(tracks.length).toEqual(1);
          expect(tracks[0].artists.length).toEqual(1);
          expect(tracks[0].artists[0].mbid).toEqual(
            listens[0].track.artists[0].mbid
          );
          expect(tracks[0].album.mbid).toEqual(listens[0].track.album.mbid);
        });

        it("it saves a track once even if it appears in two listens for the same user", async () => {
          const exampleUser = await prisma.user.findFirst();
          if (!exampleUser)
            throw new Error("No example user found. Review test setup");

          const listens = [
            getListen(
              exampleUser,
              MusicExamples.TRACK1_ART1_ALB1_1,
              new Date(1)
            ),
            getListen(
              exampleUser,
              MusicExamples.TRACK1_ART1_ALB1_1,
              new Date(2)
            ),
          ];
          await MusicService.storeListens(listens);
          const tracks = await prisma.track.findMany();
          expect(tracks.length).toEqual(1);
        });

        it("it saves a track once even if it appears in two listens for separate users", async () => {
          const exampleUsers = await prisma.user.findMany();
          if (exampleUsers.length < 2)
            throw new Error("Not enough users. Review testing setup.");

          const listens = [
            getListen(
              exampleUsers[0],
              MusicExamples.TRACK1_ART1_ALB1_1,
              new Date(1)
            ),
            getListen(
              exampleUsers[1],
              MusicExamples.TRACK1_ART1_ALB1_1,
              new Date(1)
            ),
          ];
          await MusicService.storeListens(listens);
          const tracks = await prisma.track.findMany();
          expect(tracks.length).toEqual(1);
        });

        it("it saves multiple tracks if each are not saved in the database", async () => {
          const exampleUser = await prisma.user.findFirst();
          if (!exampleUser)
            throw new Error("No example user found. Review test setup");

          const listens = [
            getListen(
              exampleUser,
              MusicExamples.TRACK1_ART1_ALB1_1,
              new Date(1)
            ),
            getListen(
              exampleUser,
              MusicExamples.TRACK2_ART1_ALB1_2,
              new Date(2)
            ),
            getListen(
              exampleUser,
              MusicExamples.TRACK3_ART2_ALB1_1,
              new Date(3)
            ),
          ];
          await MusicService.storeListens(listens);
          const tracks = await prisma.track.findMany();
          expect(tracks.length).toEqual(3);
        });

        describe("Given: there are tracks in the database", () => {
          beforeEach(async () => {
            const exampleUser = await prisma.user.findFirst();
            if (!exampleUser)
              throw new Error("No example user found. Review test setup");

            await MusicService.storeListens([
              getListen(
                exampleUser,
                MusicExamples.TRACK1_ART1_ALB1_1,
                new Date(1)
              ),
            ]);
          });

          it("it does not create a duplicate of a track already in the database", async () => {
            const exampleUser = await prisma.user.findFirst();
            if (!exampleUser)
              throw new Error("No example user found. Review test setup");

            const listens = [
              getListen(
                exampleUser,
                MusicExamples.TRACK1_ART1_ALB1_1,
                new Date(1)
              ),
            ];
            await MusicService.storeListens(listens);
            const tracks = await prisma.track.findMany();
            expect(tracks.length).toEqual(1);
          });

          it("it adds tracks that have not be saved yet", async () => {
            const exampleUser = await prisma.user.findFirst();
            if (!exampleUser)
              throw new Error("No example user found. Review test setup");

            const listens = [
              getListen(
                exampleUser,
                MusicExamples.TRACK3_ART2_ALB1_1,
                new Date(1)
              ),
              getListen(
                exampleUser,
                MusicExamples.TRACK4_ART2_ALB2_1,
                new Date(2)
              ),
            ];
            await MusicService.storeListens(listens);
            const tracks = await prisma.track.findMany();
            expect(tracks.length).toEqual(3);
          });
        });
      });

      it("it stores a listen", async () => {
        const exampleUser = await prisma.user.findFirst();
        if (!exampleUser)
          throw new Error("No example user found. Review test setup");

        const listens = [
          getListen(exampleUser, MusicExamples.TRACK1_ART1_ALB1_1, new Date(1)),
        ];
        await MusicService.storeListens(listens);
        const listensInDatabase = await prisma.listen.findMany();
        expect(listensInDatabase.length).toEqual(1);
        expect(listensInDatabase[0].listenedAt).toEqual(listens[0].listenedAt);
      });

      it("it stores a listen twice if the listenedAt is different but the track is the same", async () => {
        const exampleUser = await prisma.user.findFirst();
        if (!exampleUser)
          throw new Error("No example user found. Review test setup");

        const listens = [
          getListen(exampleUser, MusicExamples.TRACK1_ART1_ALB1_1, new Date(1)),
          getListen(exampleUser, MusicExamples.TRACK1_ART1_ALB1_1, new Date(2)),
        ];
        await MusicService.storeListens(listens);
        const listensInDatabase = await prisma.listen.findMany();
        expect(listensInDatabase.length).toEqual(2);
      });

      it("it stores a listen twice if the users are different but the track and time are the same", async () => {
        const exampleUsers = await prisma.user.findMany();
        if (exampleUsers.length < 2)
          throw new Error("Not enough users. Review testing setup.");

        const listens = [
          getListen(
            exampleUsers[0],
            MusicExamples.TRACK1_ART1_ALB1_1,
            new Date(1)
          ),
          getListen(
            exampleUsers[1],
            MusicExamples.TRACK1_ART1_ALB1_1,
            new Date(1)
          ),
        ];
        await MusicService.storeListens(listens);
        const listensInDatabase = await prisma.listen.findMany();
        expect(listensInDatabase.length).toEqual(2);
      });
    });
  });
});
