import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import * as lastfmService from "../lastfm/lastfm.service";
import { Listen, Track } from "./music.types";
import { createListenFromLastfmListen } from "./music.utils";
import { Artist as PrismaArtist, Album as PrismaAlbum } from "@prisma/client";

export async function getListensByUserId(userId: number) {
  try {
    const listens = await prisma.listen.findMany({
      where: { userId },
      include: {
        track: true,
      },
    });

    return listens;
  } catch (e) {
    console.error(e);
    throw new Error(`Could not get listens for user id: ${userId}`);
  }
}

export async function updateListensForUserByUsername(
  username: string
): Promise<Listen[]> {
  try {
    // get user
    const user = await prisma.user.findFirst({
      where: { lastfmAccount: { username } },
      include: {
        lastfmAccount: true,
      },
    });

    if (!user) {
      throw new Error(`User: ${username} not found.`);
    }
    if (!user.lastfmAccount) {
      throw new Error(`User ${username} does not have a lastfm account.`);
    }

    // find last listen
    const lastListen = await prisma.listen.findFirst({
      where: { userId: user.id },
      orderBy: { listenedAt: "desc" },
    });

    // get one page of listens from last listen
    const from = lastListen ? lastListen.listenedAt : undefined;
    const lastfmUsername = user.lastfmAccount.username;

    const lastfmListens = await lastfmService.getRecentTracks(
      lastfmUsername,
      from
    );

    const listens = lastfmListens.map(createListenFromLastfmListen);

    // Add listens to db
    // It feels like we should have a way of de-duplicating listens here,
    // but last.fm doesn't provide a unique identifier for the listens.

    // - Artists and Albums
    const distinctArtists = new Map<string, string>(
      listens.map((l) => [l.track.artist.mbid, l.track.artist.name])
    );
    const distinctAlbumsMbids = new Map<string, string>(
      listens.map((l) => [l.track.album.mbid, l.track.album.name])
    );

    const newPrismaArtists = [];
    for (const [key, value] of distinctArtists) {
      newPrismaArtists.push({ mbid: key, name: value });
    }
    const newPrismaAlbums = [];
    for (const [key, value] of distinctAlbumsMbids) {
      newPrismaAlbums.push({ mbid: key, name: value });
    }

    if (process.env.VERBOSE) {
      console.log("\n\nartists to add");
      console.dir(newPrismaArtists, { depth: null });
      console.log("\n\nalbums to add");
      console.dir(newPrismaAlbums, { depth: null });
    }

    const artistDbPromise = prisma.artist.createMany({
      data: newPrismaArtists,
      skipDuplicates: true,
    });
    const albumDbPromise = prisma.album.createMany({
      data: newPrismaAlbums,
      skipDuplicates: true,
    });
    const [artistDbResponse, albumDbResponse] = await Promise.all([
      artistDbPromise,
      albumDbPromise,
    ]);

    // - New Tracks
    const distinctTracksByMbid = new Map<string, Track>(
      listens.map((l) => [l.track.mbid, l.track])
    );

    // get the artists and albums we'll need to save tracks
    const [artistsForTracks, albumsForTracks] = await Promise.all([
      prisma.artist.findMany({
        where: {
          OR: newPrismaArtists.map((a) => ({ mbid: a.mbid })),
        },
      }),
      prisma.album.findMany({
        where: {
          OR: newPrismaAlbums.map((a) => ({ mbid: a.mbid })),
        },
      }),
    ]);
    const artistByMbid = new Map<string, PrismaArtist>(
      artistsForTracks.map((a) => [a.mbid, a])
    );
    const albumByMbid = new Map<string, PrismaAlbum>(
      albumsForTracks.map((a) => [a.mbid, a])
    );

    const newTrackPromises = [];

    for (const [trackMbid, track] of distinctTracksByMbid) {
      const albumId = albumByMbid.get(track.album.mbid)?.id;
      const artistId = artistByMbid.get(track.artist.mbid)?.id;

      if (albumId && artistId) {
        const trackPromise = prisma.track.upsert({
          // I'm using "upsert" to do a kind of "create if not exists"
          where: { mbid: trackMbid },
          update: {
            name: track.name,
          },
          create: {
            name: track.name,
            mbid: trackMbid,
            lastfmUrl: track.url,
            album: {
              connect: {
                id: albumId,
              },
            },
            artists: {
              connect: {
                id: artistId,
              },
            },
          },
        });

        newTrackPromises.push(trackPromise);
      }
    }

    const newTracks = await Promise.all(newTrackPromises);
    // I don't know how many tracks were created...

    // - Listens
    const newListensRequests = [];
    const createdListens = [];
    for (const listen of listens) {
      const trackId = newTracks.find((t) => t.mbid === listen.track.mbid)?.id;
      if (trackId) {
        createdListens.push(listen);
        newListensRequests.push({
          listenedAt: listen.date,
          trackId: trackId,
          userId: user.id,
        });
      }
    }
    await prisma.listen.createMany({
      data: newListensRequests,
    });

    if (process.env.VERBOSE) {
      console.log("\n\nlistens created");
      console.dir(createdListens, { depth: null });
    }

    // return new listens
    return createdListens;
  } catch (e) {
    console.error(e);
    throw new Error(`Could not update listens for user: ${username}`);
  }
}
