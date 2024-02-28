import * as MusicStorage from "../music.storage";

import { Artist as PrismaArtist } from "@prisma/client";
import { Playlist } from "../playlists/playlists.types";
import { convertPrismaTrackAndArtistsToTrack } from "../music.utils";

async function populateWithArtists(): Promise<PrismaArtist[]> {
  const artist1 = await MusicStorage.upsertArtist({
    name: "Test Artist 1",
    spotifyId: "testArtist1",
  });
  const artist2 = await MusicStorage.upsertArtist({
    name: "Test Artist 2",
    spotifyId: "testArtist2",
  });

  return [artist1, artist2];
}

export async function populateWithTracks() {
  const artists = await populateWithArtists();

  const track1 = await MusicStorage.upsertTrack({
    name: "Test 1",
    spotifyId: "test1",
    artists: [artists[0]],
  });

  const track2 = await MusicStorage.upsertTrack({
    name: "Test 2",
    spotifyId: "test2",
    artists: [artists[1]],
  });

  const track3 = await MusicStorage.upsertTrack({
    name: "Test 3",
    spotifyId: "test3",
    artists: [artists[0]],
  });

  return [track1, track2, track3];
}

export async function getExamplePlaylist(): Promise<Playlist> {
  const prismaTracks = await populateWithTracks();
  const tracks = prismaTracks.map((prismaTrack) => ({
    ...convertPrismaTrackAndArtistsToTrack(prismaTrack, prismaTrack.artists),
  }));

  return {
    tracks: { items: tracks },
  };
}
