import { PrismaClient } from "@prisma/client";
import cron from "node-cron";
import { triggerUpdateListenHistoryByUserId } from "../users/users.service";

const prisma = new PrismaClient();

// every day at 9am, update listening history for all users
async function updateListenHistory() {
  console.log("updating listen history for all users");
  const allUserIds = (
    await prisma.user.findMany({
      select: {
        id: true,
      },
    })
  ).map((user) => user.id);

  allUserIds.forEach(async (userId) => {
    const response = await triggerUpdateListenHistoryByUserId(userId);
    console.log(response);
  });
}
console.log("scheduling Update Listening History to run every day at 9:00am");
cron.schedule("0 9 * * *", updateListenHistory);
