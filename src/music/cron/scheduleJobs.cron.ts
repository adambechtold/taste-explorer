import cron from "node-cron";

import { createListensFromLastfmListens } from "./createListensFromLastfmListens.cron";

const tasksMap = new Map<string, () => void>([
  ["createListens", scheduleCreateListensTask],
]);

function main() {
  const args = process.argv.slice(2);

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
