import { PlaylistCache } from "../playlists.cache";
import {
  getExamplePlaylist,
  populateWithTracks,
} from "../../testingUtils/music.test.utils";

describe("Playlist Cache", () => {
  describe("Given: there are tracks in the database", () => {
    beforeAll(async () => {
      await populateWithTracks();
    });

    describe("basic api", () => {
      it("does not return an item is not in the cache", () => {
        const cache = new PlaylistCache();
        expect(cache.get("foo")).toBeUndefined();
      });

      it("can set and get an item", async () => {
        const cache = new PlaylistCache();
        const playlist = await getExamplePlaylist();
        cache.set("foo", playlist);
        expect(cache.get("foo")).toEqual(playlist);
      });

      it("can delete an item", async () => {
        const cache = new PlaylistCache();
        const playlist = await getExamplePlaylist();
        cache.set("foo", playlist);
        cache.delete("foo");
        expect(cache.get("foo")).toBeUndefined();

        // only the deleted item should be removed
        cache.set("foo", playlist);
        cache.set("baz", playlist);
        cache.delete("foo");
        expect(cache.get("foo")).toBeUndefined();
        expect(cache.get("baz")).toEqual(playlist);
      });
    });

    describe("cache size limit", () => {
      it("fails if the cache size is less than 1", () => {
        expect(() => new PlaylistCache(0)).toThrow();
      });

      it("does not add more items than the cache size", async () => {
        const playlist = await getExamplePlaylist();
        const numberOfTracks = playlist.tracks.items.length;
        const cache = new PlaylistCache(numberOfTracks - 2);
        cache.set("foo", playlist);
        expect(cache.get("foo")).toBeUndefined();
      });

      it("removes the oldest item when the cache is full", async () => {
        const playlist = await getExamplePlaylist();
        const numberOfTracks = playlist.tracks.items.length;

        const cache = new PlaylistCache(numberOfTracks * 2);
        cache.set("foo", playlist);
        cache.set("bar", playlist);
        cache.set("baz", playlist);

        expect(cache.get("foo")).toBeUndefined();
        expect(cache.get("bar")).toEqual(playlist);
        expect(cache.get("baz")).toEqual(playlist);

        cache.set("foo", playlist);
        expect(cache.get("foo")).toEqual(playlist);
        expect(cache.get("bar")).toBeUndefined();
        expect(cache.get("baz")).toEqual(playlist);
      });
    });
  });
});
