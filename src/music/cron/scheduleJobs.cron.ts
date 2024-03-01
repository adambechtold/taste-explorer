import cron from "node-cron";

import {
  createListensFromLastfmListens,
  markAllLastfmListensAsNotUpdating,
} from "./createListensFromLastfmListens.cron";
import {
  updateListenHistory,
  markAllUsersAsNotUpdating,
} from "./updateListeningHistory.cron";
import { addFeaturesToTracks } from "./addFeaturesToTracks.cron";
import { Logger } from "../../utils/log.utils";
import {
  searchSpotifyForTracks,
  markAllSpotifySearchesAsNotBeingSearched,
} from "./searchSpotifyForTracks.cron";

const tasksMap = new Map<string, () => void>([
  ["createListens", scheduleCreateListensTask],
  ["updateListeningHistory", scheduleUpdateListeningHistory],
  ["addFeaturesToTracks", scheduleAddFeaturesToTrack],
  ["searchSpotifyForTracks", scheduleSearchSpotifyForTracks],
]);

const logger = new Logger();
const createListenLogger = new Logger("createListens");
const updateListenHistoryLogger = new Logger("updateListeningHistory");
const addFeaturesToTracksLogger = new Logger("addFeaturesToTracks");
const searchSpotifyForTracksLogger = new Logger("searchSpotifyForTracks");

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    logger.log("No tasks specified, exiting");
    return;
  }

  args.forEach((arg) => {
    const task = tasksMap.get(arg);
    if (task) {
      task();
    } else {
      logger.warn(`Unknown task: ${arg}`);
    }
  });
}

main();

function scheduleCreateListensTask() {
  const intervalInSeconds = process.env.CREATE_LISTENS_INTERVAL_IN_SECONDS || 5;

  createListenLogger.log(
    `Research Next Lastfm Listen will run every ${intervalInSeconds} seconds`
  );

  let researchListensTask: cron.ScheduledTask;
  markAllLastfmListensAsNotUpdating();
  researchListensTask = cron.schedule(`*/${intervalInSeconds} * * * * *`, () =>
    createListensFromLastfmListens(researchListensTask)
  );
}

function scheduleUpdateListeningHistory() {
  const intervalInSeconds =
    process.env.UPDATE_LISTENING_HISTORY_INTERVAL_IN_SECONDS || 5;

  updateListenHistoryLogger.log(
    `Update Listening History will run every ${intervalInSeconds} seconds`
  );

  markAllUsersAsNotUpdating();

  let updateListenHistoryTask: cron.ScheduledTask;
  updateListenHistoryTask = cron.schedule(
    `*/${intervalInSeconds} * * * * *`,
    () => updateListenHistory(updateListenHistoryTask)
  );
}

function scheduleAddFeaturesToTrack() {
  const intervalInMinutes =
    process.env.ADD_FEATURES_TO_TRACKS_INTERVAL_IN_MINUTES || 5;

  addFeaturesToTracksLogger.log(
    `Add Features To Tracks will run every ${intervalInMinutes} minutes`
  );

  let addFeaturesToTracksTask: cron.ScheduledTask;
  addFeaturesToTracksTask = cron.schedule(
    `*/${intervalInMinutes} * * * *`,
    () => addFeaturesToTracks(addFeaturesToTracksTask)
  );
}

function scheduleSearchSpotifyForTracks() {
  const intervalInSeconds =
    process.env.SEARCH_SPOTIFY_FOR_TRACKS_INTERVAL_IN_SECONDS || 10;

  searchSpotifyForTracksLogger.log(
    `Search Spotify For Tracks will run every ${intervalInSeconds} seconds`
  );

  let searchSpotifyForTracksTask: cron.ScheduledTask;
  markAllSpotifySearchesAsNotBeingSearched();
  searchSpotifyForTracksTask = cron.schedule(
    `*/${intervalInSeconds} * * * * *`,
    () => searchSpotifyForTracks(searchSpotifyForTracksTask)
  );
}
