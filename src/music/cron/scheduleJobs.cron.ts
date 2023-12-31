import cron from "node-cron";

import { createListensFromLastfmListens } from "./createListensFromLastfmListens.cron";
import {
  updateListenHistory,
  markAllUsersAsNotUpdating,
} from "./updateListeningHistory.cron";

const tasksMap = new Map<string, () => void>([
  ["createListens", scheduleCreateListensTask],
  ["updateListeningHistory", scheduleUpdateListeningHistory],
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
  const intervalInSeconds = 5;
  console.log(
    `Update Listening History will run every ${intervalInSeconds} seconds`
  );
  markAllUsersAsNotUpdating();
  let updateListenHistoryTask: cron.ScheduledTask;
  updateListenHistoryTask = cron.schedule(
    `*/${intervalInSeconds} * * * * *`,
    () => updateListenHistory(updateListenHistoryTask)
  );
}
