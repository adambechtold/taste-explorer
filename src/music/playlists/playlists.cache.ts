import { LRUCache } from "lru-cache";
import { Playlist, PreferenceType } from "./playlists.types";

function sizeCalculation(playlist: Playlist) {
  const hasTracks = playlist.tracks.items.length > 0;
  return hasTracks ? playlist.tracks.items.length : 1;
}

export class PlaylistCache {
  private cache: LRUCache<string, any>;

  constructor(maxNumTracks: number = 1000) {
    this.cache = new LRUCache({
      maxSize: maxNumTracks,
      sizeCalculation: sizeCalculation,
      ttl: 1000 * 60 * 60 * 12, // half a day
      allowStale: false, // we will not return a stale playlist
    });
  }

  static createKey(
    userIds: [number, number],
    preference: PreferenceType,
  ): string {
    return [...userIds, preference].join("-");
  }

  /**
   * Retrieves a playlist from the cache using a primary key or an optional alternative key.
   *
   * This function first tries to retrieve the playlist using the primary key. If the playlist is not found, it tries to retrieve the playlist using the alternative key.
   *
   * @param {string} key - The primary key.
   * @param {string | undefined} alternativeKey - The alternative key. This parameter is optional.
   * @returns {Playlist | undefined} The playlist if found, or undefined if not found.
   */
  get(key: string): Playlist | undefined {
    return this.cache.get(key);
  }

  set(key: string, playlist: Playlist) {
    this.cache.set(key, playlist);
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}
