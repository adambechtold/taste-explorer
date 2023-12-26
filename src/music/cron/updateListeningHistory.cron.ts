import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

import { triggerUpdateListenHistoryByUserId } from "../../users/users.service";

const prisma = new PrismaClient({ log: ["error"] });

console.log("Update Listening History will run every day at 9:00am");
cron.schedule("0 9 * * *", updateListenHistory);

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
