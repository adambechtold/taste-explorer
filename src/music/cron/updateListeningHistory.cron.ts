import cron from "node-cron";
import { PrismaClient, User } from "@prisma/client";

import { triggerUpdateListenHistoryByUserId } from "../../users/users.service";
import { markUserUpdatingHistoryStatus } from "../../users/users.storage";

const prisma = new PrismaClient({ log: ["error"] });

const maximumNumberOfUsersUpdatedInParallel = 1;

export async function markAllUsersAsNotUpdating() {
  await prisma.user.updateMany({
    where: {
      isUpdatingListeningHistory: true,
    },
    data: {
      isUpdatingListeningHistory: false,
    },
  });
}

export async function updateListenHistory(task: cron.ScheduledTask) {
  const numberOfUsersBeingUpdated = await getNumberOfUsersBeingUpdated();

  if (numberOfUsersBeingUpdated >= maximumNumberOfUsersUpdatedInParallel) {
    console.log(
      `...${numberOfUsersBeingUpdated} users are being updated, skipping this run`
    );
    return;
  }

  const user = await getNextUserToUpdate();

  if (user === null) {
    console.log("no users to update");
    return;
  }

  const response = await triggerUpdateListenHistoryByUserId(user.id);

  console.log({
    message: "updated user",
    userId: user.id,
    listensToImport: response.listensToImport,
  });
}

function getNumberOfUsersBeingUpdated(): Promise<number> {
  return prisma.user.count({
    where: {
      isUpdatingListeningHistory: true,
    },
  });
}

export async function getNextUserToUpdate(): Promise<User | null> {
  const users = (await prisma.$queryRaw`
    SELECT
      * 
    FROM 
      User
    ORDER BY 
      lastUpdatedListeningHistoryAt ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  `) as User[];

  if (users.length === 0) {
    return null;
  }

  // mark user as updating; This will be undone when the update is complete
  await markUserUpdatingHistoryStatus(users[0].id, true);

  return users[0];
}
