import { UserWithId } from "../../users/users.types";
import { PreferenceType, Playlist } from "./playlists.types";

export async function getPlaylist(
  user1: UserWithId,
  user2: UserWithId,
  preferenceType: PreferenceType
): Promise<Playlist> {
  const playlist: Playlist = {
    tracks: [],
  };

  return playlist;
}
