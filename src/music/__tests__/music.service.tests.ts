import { PrismaClient } from "@prisma/client";
import { TypedError } from "../../errors/errors.types";
import { populateWithTracks } from "../testingUtils/music.test.utils";
import { UserWithId } from "../../users/users.types";
import SpotifyApi from "../../spotify/spotify.api";

import * as MusicService from "../music.service";

const prisma = new PrismaClient({ log: ["error"] });

describe("Music Service", () => {
  describe("Trigger Update Listens for User", () => {
    let consoleError = jest
      .spyOn(global.console, "error")
      .mockImplementation(() => {});

    beforeEach(() => {
      consoleError.mockClear();
    });

    afterAll(() => {
      consoleError.mockRestore();
    });

    it("throws an error if the user doesn't have a lastfmAccount", async () => {
      const user: UserWithId = {
        id: 1,
      };

      try {
        await MusicService.triggerUpdateListensForUser(user);
      } catch (error) {
        if (error instanceof TypedError) {
          expect(error.message).toEqual(
            "Cannot trigger update listens for user without lastfm account."
          );
          expect(error.status).toEqual(400);
        } else {
          throw error;
        }
      }
    });
  });

  describe("Get Track Name and Artist Name", () => {
    describe("Given: There are tracks in the database", () => {
      beforeAll(async () => {
        await populateWithTracks();
      });

      it("finds an exact match", async () => {
        const exampleTrack = await prisma.track.findFirst({
          include: { artists: true },
        });

        if (!exampleTrack) {
          throw new Error("No example track found. Check test configuration");
        }

        if (exampleTrack.artists.length < 1) {
          throw new Error(
            "Example track does not have any artists. Check test configuration"
          );
        }

        const trackName = exampleTrack.name;
        const artistName = exampleTrack.artists[0].name;

        const foundTrack = await MusicService.getTrackByNameAndArtistName(
          trackName,
          artistName
        );

        expect(foundTrack).not.toBeNull();
        expect(foundTrack?.name).toEqual(trackName);
        expect(foundTrack?.id).toEqual(exampleTrack.id);
      });

      it("it does not call spotify if the track is not found in the database", async () => {
        const spotifyApi = new SpotifyApi();
        const spotifyApiGetTrackSpy = jest.spyOn(spotifyApi, "searchTracks");

        const trackName = "A long track name that now one would ever use";
        const artistName = "A very unique artist name";

        const foundTrack = await MusicService.getTrackByNameAndArtistName(
          trackName,
          artistName
        );

        expect(foundTrack).toBeNull();
        expect(spotifyApiGetTrackSpy).not.toHaveBeenCalled();
        spotifyApiGetTrackSpy.mockRestore();
      });
    });
  });

  describe("Store Track for Spotify Lookup", () => {
    describe("Given: There are no pending queries in the queue", () => {
      beforeEach(async () => {
        await prisma.spotifyTrackSearchQueue.deleteMany({});
      });

      it("can store a track for spotify lookup", async () => {
        const trackName = "A long track name that now one would ever use";
        const artistName = "A very unique artist name";

        await MusicService.storeTrackForSpotifyLookup(trackName, artistName);

        const foundQueueEvent = await prisma.spotifyTrackSearchQueue.findFirst({
          where: {
            trackName,
            artistName,
          },
        });

        expect(foundQueueEvent).not.toBeNull();
        expect(foundQueueEvent?.trackName).toEqual(trackName);
        expect(foundQueueEvent?.artistName).toEqual(artistName);
        expect(foundQueueEvent?.searchedAt).toBeNull();
      });

      it("will not store multiple instances of the same query params", async () => {
        const trackName = "A long track name that now one would ever use";
        const artistName = "A very unique artist name";

        await MusicService.storeTrackForSpotifyLookup(trackName, artistName);
        await MusicService.storeTrackForSpotifyLookup(trackName, artistName);

        const foundQueueEvents = await prisma.spotifyTrackSearchQueue.findMany({
          where: {
            trackName,
            artistName,
          },
        });

        expect(foundQueueEvents.length).toEqual(1);
      });

      it("will store multiple instances if either the track or artist name is different", async () => {
        const trackName = "A long track name that now one would ever use";
        const artistName = "A very unique artist name";

        await MusicService.storeTrackForSpotifyLookup(trackName, artistName);
        await MusicService.storeTrackForSpotifyLookup(
          trackName,
          "Different Artist"
        );
        await MusicService.storeTrackForSpotifyLookup(
          "Different Track",
          artistName
        );
        await MusicService.storeTrackForSpotifyLookup(trackName, artistName);

        const foundQueueEvents =
          await prisma.spotifyTrackSearchQueue.findMany();

        expect(foundQueueEvents.length).toEqual(3);
      });
    });
  });
});
