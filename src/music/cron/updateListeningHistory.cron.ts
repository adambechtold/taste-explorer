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

/**
 *
 * @param {cron.ScheduledTask} task
 */
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
    message: "updating user",
    userId: user.id,
    listensToImport: response.listensToImport,
  });
}

/**
 *
 * @returns the number of users that are currently being updated
 */
function getNumberOfUsersBeingUpdated(): Promise<number> {
  return prisma.user.count({
    where: {
      isUpdatingListeningHistory: true,
    },
  });
}

export async function getNextUserToUpdate(): Promise<User | null> {
  return await prisma.$transaction(async (tx) => {
    const users = (await tx.$queryRaw`
      SELECT
        * 
      FROM 
        User
      WHERE 
        isUpdatingListeningHistory = false
      ORDER BY 
        lastUpdatedListeningHistoryAt ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
    `) as User[];

    if (users.length === 0) {
      return null;
    }

    let user = users[0];

    // mark user as updating; This will be undone when the update is complete
    await tx.$executeRaw`UPDATE User SET isUpdatingListeningHistory = true WHERE id = ${user.id};`;

    const updatedUserStateResponse = await tx.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (!updatedUserStateResponse) {
      throw new Error(`Could not find user with id ${user.id}`);
    }

    user = updatedUserStateResponse;

    return user;
  });
}
