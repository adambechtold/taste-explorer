import { LastfmListen } from "@prisma/client";
import { User } from "../users/users.types";

export type Track = {
  name: string;
  artists: Artist[];
  spotifyId: string;
  features?: Partial<TrackFeatures>;
  mbid?: string;
  internationalRecordingCode?: string;
  internationalArticleNumber?: string;
  universalProductCode?: string;
  imageUrl?: string;
  featuresAnalyzedAt?: Date;
};

export type TrackWithId = Track & {
  id: number;
};

export type TrackFeatures = {
  /**
   * Acousticness: Confidence measure of whether the track is acoustic
   * - Range: 0.0 - 1.0
   * - 1.0 represents high confidence the track is acoustic
   * - 0.0 represents low confidence the track is acoustic
   */
  acousticness: number;

  /**
   * Danceability: Suitability for dancing
   * - Range: 0.0 - 1.0
   * - 0.0 == least danceable
   * - 1.0 == most danceable
   */
  danceability: number;

  durationMs: number; // ms

  /**
   * Energy: Perceptual measure of intensity and activity
   * - Range: 0.0 - 1.0
   * - 1.0 == high energy
   * - 0.0 == low energy
   * Based on dynamic range, loudness, timbre, onset rate, and general entropy
   */
  energy: number;

  /**
   * Instrumentalness
   * - Range: 0.0 - 1.0
   * - The closer to 1.0, the greater likelihood the track contains no vocal content
   * - >0.5 is intended to represent instrumental tracks, but confidence is higher as value
   *    approaches 1.0
   */
  instrumentalness: number;

  /**
   * Key: The estimated overall key of the track
   * - Range: -1 - 11
   * 1 == no key was detected
   * 0 == C
   * 1 == C#/D
   * 2 == D
   * ...
   */
  key: number;

  /**
   * Liveness: Presence of an audience in the recording
   * - Range: 0.0 - 1.0
   * - 1.0 == high likelihood the track is live
   * - 0.0 == low likelihood the track is live
   */
  liveness: number;

  /**
   * Loudness: Overall loudness of a track in decibels (dB)
   * - Range: -60 - 0
   * - 0 == loudest
   * - -60 == quietest
   */
  loudness: number;

  /**
   * Mode: See below
   */
  mode: Mode;

  /**
   * Speechiness: Presence of spoken words
   * - Range - 0-1.0
   * - Above 0.66 - track is probably entirely spoken word
   * - 0.33 - 0.66 - Music and speech, like rap
   * - Below 0.33 - Most likely just music and non-speech tracks
   */
  speechiness: number;

  tempo: number; // BPM

  /**
   * Time Signature
   * Number over 4
   * - Example - 7 would be a 7/4 time signature
   * - Range - 3-7
   */
  timeSignature: number; // number over 4. E.g. 7 would be a 7/4 time signature. Range 3-7

  /**
   * Valence: Measure of Positivity
   * - Range - 0.0 - 1.0
   * High valence sounds more positive (e.g. happy, cheerful, euphoric)
   * Low valence sounds more negative (e.g. sad, depressed, angry)
   * - Example - 0.428
   */
  valence: number; // measure of positiveness
};

/**
 * Mode: The modality (major/minor) of a track
 * In the spotify api, this is a number.
 * 1 == Major
 * 0 == Minor
 */
type Mode = "Major" | "Minor";

export type Artist = {
  name: string;
  spotifyId: string;
  imageUrl?: string;
};

export type Listen = {
  date: Date;
  track: Track;
  user: User;
  lastfmListen?: LastfmListen;
};
