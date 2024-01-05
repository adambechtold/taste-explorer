import cron, { schedule } from "node-cron";

import { createListensFromLastfmListens } from "./createListensFromLastfmListens.cron";
import {
  updateListenHistory,
  markAllUsersAsNotUpdating,
} from "./updateListeningHistory.cron";
import { addFeaturesToTracks } from "./addFeaturesToTracks.cron";

const tasksMap = new Map<string, () => void>([
  ["createListens", scheduleCreateListensTask],
  ["updateListeningHistory", scheduleUpdateListeningHistory],
  ["addFeaturesToTracks", scheduleAddFeaturesToTrack],
]);

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("No tasks specified, exiting");
    return;
  }

  args.forEach((arg) => {
    const task = tasksMap.get(arg);
    if (task) {
      task();
    } else {
      console.warn(`Unknown task: ${arg}`);
    }
  });
}

main();

function scheduleCreateListensTask() {
  const intervalInSeconds = 1;
  console.log(
    `Research Next Lastfm Listen will run every ${intervalInSeconds} seconds`
  );
  let researchListensTask: cron.ScheduledTask;
  researchListensTask = cron.schedule(`*/${intervalInSeconds} * * * * *`, () =>
    createListensFromLastfmListens(researchListensTask)
  );
}

function scheduleUpdateListeningHistory() {
  const intervalInMinutes = 10;
  console.log(
    `Update Listening History will run every ${intervalInMinutes} minutes`
  );
  markAllUsersAsNotUpdating();
  let updateListenHistoryTask: cron.ScheduledTask;
  updateListenHistoryTask = cron.schedule(
    `*/${intervalInMinutes} * * * *`,
    () => updateListenHistory(updateListenHistoryTask)
  );
}

function scheduleAddFeaturesToTrack() {
  const intervalInMinutes = 10;
  console.log(
    `Add Features To Tracks will run every ${intervalInMinutes} minutes`
  );
  let addFeaturesToTracksTask: cron.ScheduledTask;
  addFeaturesToTracksTask = cron.schedule(
    `*/${intervalInMinutes} * * * *`,
    () => addFeaturesToTracks(addFeaturesToTracksTask)
  );
}
