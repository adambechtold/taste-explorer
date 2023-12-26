import cron from "node-cron";

export const pauseTask = (task: cron.ScheduledTask, seconds: number) => {
  task.stop();
  setTimeout(() => {
    task.start();
  }, seconds * 1000);
};
