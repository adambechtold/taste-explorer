import { Artist as PrismaArtist, Track as PrismaTrack } from "@prisma/client";
import { TrackWithId } from "./music.types";

export function convertPrismaTrackAndArtistsToTrack(
  prismaTrack: PrismaTrack,
  prismaArtists: PrismaArtist[],
): TrackWithId {
  const {
    name,
    spotifyId,
    imageUrl,
    mbid,
    internationalArticleNumber,
    internationalRecordingCode,
    universalProductCode,
    acousticness,
    danceability,
    durationMs,
    energy,
    instrumentalness,
    key,
    liveness,
    loudness,
    mode,
    speechiness,
    tempo,
    timeSignature,
    valence,
  } = prismaTrack;

  return {
    id: prismaTrack.id,
    name,
    artists: prismaArtists.map((prismaArtist) => ({
      name: prismaArtist.name,
      spotifyId: prismaArtist.spotifyId,
    })),
    spotifyId,
    imageUrl: imageUrl || undefined,
    mbid: mbid || undefined,
    internationalArticleNumber: internationalArticleNumber || undefined,
    internationalRecordingCode: internationalRecordingCode || undefined,
    universalProductCode: universalProductCode || undefined,
    features: {
      acousticness: acousticness || undefined,
      danceability: danceability || undefined,
      durationMs: durationMs || undefined,
      energy: energy || undefined,
      instrumentalness: instrumentalness || undefined,
      key: key || undefined,
      liveness: liveness || undefined,
      loudness: loudness || undefined,
      mode: mode || undefined,
      speechiness: speechiness || undefined,
      tempo: tempo || undefined,
      timeSignature: timeSignature || undefined,
      valence: valence || undefined,
    },
  };
}
