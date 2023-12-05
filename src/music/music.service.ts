import { Prisma, PrismaClient, Track as PrismaTrack } from "@prisma/client";
const prisma = new PrismaClient();

import { Listen, Track, Artist, Album } from "./music.types";
import { UserWithId } from "../users/users.types";
import { TypedError } from "../errors/errors.types";
import { LastfmListensEventEmitter } from "../lastfm/lastfm.types";
import { createListenFromLastfmListen } from "./music.utils";
import * as LastfmService from "../lastfm/lastfm.service";

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

export async function triggerUpdateListensForUser(
  user: UserWithId
): Promise<LastfmListensEventEmitter> {
  // TODO: replace this with a kind of generic event emitter

  try {
    if (!user.lastfmAccount) {
      throw new TypedError("User does not have a lastfm account", 400);
    }

    // find last listen
    //    const lastListen = await prisma.listen.findFirst({
    //      where: { userId: user.id },
    //      orderBy: { listenedAt: "desc" },
    //    });

    // get one page of listens from last listen
    //    const from = lastListen ? lastListen.listenedAt : undefined;
    const lastfmUsername = user.lastfmAccount.username;

    // ---- CONFIGURE EVENT EMITTER ----
    const updateTracker = new LastfmListensEventEmitter();

    updateTracker.onListens((lastfmListens) => {
      console.log(
        `Got ${lastfmListens.length} listens for user: ${lastfmUsername}`
      );
      const listens = lastfmListens.map((l) =>
        createListenFromLastfmListen(l, user)
      );
      const a = storeListens(listens);
    });

    updateTracker.onEnd(() => {
      console.log(`Finished updating listens for user: ${lastfmUsername}`);
    });

    updateTracker.onError((e) => {
      console.error(e);
      throw new TypedError(
        `Could not update listens for user: ${lastfmUsername}`,
        500
      );
    });

    // ---- TRIGGER UPDATE ----
    LastfmService.getAllListens(lastfmUsername, updateTracker);

    return updateTracker;
  } catch (e: any) {
    console.error(e);
    console.log(e);
    throw new TypedError(`Could not update listens for user: ${user.id}`, 500);
  }
}

export async function storeListens(listens: Listen[]): Promise<{
  artist: Prisma.BatchPayload;
  album: Prisma.BatchPayload;
  track: Prisma.BatchPayload;
  listen: Prisma.BatchPayload;
}> {
  const artistResult = await storeArtists(
    listens.map((l) => l.track.artists[0])
  );
  const albumResult = await storeAlbums(listens.map((l) => l.track.album));
  const tracksResult = await storeTracks(listens.map((l) => l.track));

  // store listens
  const listenPromises = listens.map(async (l) => {
    const matchingListen = await prisma.listen.findFirst({
      where: {
        userId: l.user.id,
        track: { mbid: l.track.mbid },
        listenedAt: l.listenedAt,
      },
    });

    if (matchingListen) {
      return;
    }

    return prisma.listen.create({
      data: {
        listenedAt: l.listenedAt,
        track: {
          connect: { mbid: l.track.mbid },
        },
        user: {
          connect: { id: l.user.id },
        },
      },
    });
  });

  const listenResults = await Promise.all(listenPromises);
  const listenResultCount: Prisma.BatchPayload = {
    count: listenResults.length,
  };

  return {
    track: tracksResult,
    artist: artistResult,
    album: albumResult,
    listen: listenResultCount,
  };
}

async function storeAlbums(albums: Album[]): Promise<Prisma.BatchPayload> {
  const albumsByMbid = new Map<string, Album>(albums.map((a) => [a.mbid, a]));
  const albumResults = Array.from(albumsByMbid).map((a) => {
    const artists = a[1].artists;
    const artistMbids = artists.map((a) => a.mbid);

    return prisma.album.upsert({
      where: { mbid: a[0] },
      update: {
        artists: {
          connect: artistMbids.map((m) => ({ mbid: m })),
        },
      },
      create: {
        mbid: a[0],
        name: a[1].name,
        artists: {
          connect: artistMbids.map((m) => ({ mbid: m })),
        },
      },
    });
  });
  const albumResult = await Promise.all(albumResults);
  const albumResultCount: Prisma.BatchPayload = {
    count: albumResult.length,
  };

  return albumResultCount;
}

async function storeArtists(artists: Artist[]): Promise<Prisma.BatchPayload> {
  const artistsByMbid = new Map<string, Artist>(
    artists.map((a) => [a.mbid, a])
  );

  const artistResult = await prisma.artist.createMany({
    data: Array.from(artistsByMbid).map((a) => ({
      mbid: a[0],
      name: a[1].name,
    })),
    skipDuplicates: true,
  });

  return artistResult;
}

async function storeTracks(tracks: Track[]): Promise<Prisma.BatchPayload> {
  const tracksByMbid = new Map<string, Track>(
    tracks.filter((t) => t.mbid).map((t) => [t.mbid, t])
  );

  const trackPromises = [] as Prisma.Prisma__TrackClient<PrismaTrack>[];

  Array.from(tracksByMbid).forEach((t) => {
    const albumMbid = t[1].album.mbid;
    const artistMbids = t[1].artists.map((a) => a.mbid);

    if (albumMbid && artistMbids.length > 0) {
      const trackPromise = prisma.track.upsert({
        // upsert is required because we can't do joins in the where clause of createMany unless we have the ID
        where: { mbid: t[0] },
        update: {
          name: t[1].name,
        },
        create: {
          name: t[1].name,
          mbid: t[0],
          lastfmUrl: t[1].url,
          album: {
            connect: {
              mbid: albumMbid,
            },
          },
          artists: {
            connect: artistMbids.map((m) => ({ mbid: m })),
          },
        },
      });

      trackPromises.push(trackPromise);
    }
  });

  const trackResults = await Promise.all(trackPromises);
  const trackResultCount: Prisma.BatchPayload = {
    count: trackResults.length,
  };
  return trackResultCount;
}
