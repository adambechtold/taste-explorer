import { LRUCache } from "lru-cache";
import { Playlist, PreferenceType } from "./playlists.types";

function sizeCalculation(playlist: Playlist) {
  return playlist.tracks.items.length;
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
    preference: PreferenceType
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
  get(
    key: string,
    alternativeKey: string | undefined = undefined
  ): Playlist | undefined {
    const primaryKeyResult = this.cache.get(key);
    if (primaryKeyResult) {
      return primaryKeyResult;
    }

    // if the primary key is not found, try the alternative key
    if (alternativeKey) {
      const alternativeKeyResult = this.cache.get(alternativeKey);
      if (alternativeKeyResult) {
        return alternativeKeyResult;
      }
    }
  }

  set(key: string, playlist: Playlist) {
    this.cache.set(key, playlist);
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}
