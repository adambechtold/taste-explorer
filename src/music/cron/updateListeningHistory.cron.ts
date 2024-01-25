import cron from "node-cron";
import { PrismaClient, User } from "@prisma/client";
import { Logger } from "../../utils/log.utils";

import { triggerUpdateListenHistoryByUserId } from "../../users/users.service";

const prisma = new PrismaClient({ log: ["error"] });
const logger = new Logger("updateListeningHistory");

const maximumNumberOfUsersUpdatedInParallel = 1;
let waitCount = 0;
const MAX_WAITS = 5;

/**
 * Continuously fetches listening history for all users.
 *
 * @param {cron.ScheduledTask} task - The cron task that is running this function
 */
export async function updateListenHistory(task: cron.ScheduledTask) {
  const numberOfUsersBeingUpdated = await getNumberOfUsersBeingUpdated();

  if (numberOfUsersBeingUpdated >= maximumNumberOfUsersUpdatedInParallel) {
    if (waitCount >= MAX_WAITS) {
      logger.log(
        `... we have waited too many times. The job is likely stuck. Marking all users as not updating and continuing.`
      );
      await markAllUsersAsNotUpdating();
      waitCount = 0;
    } else {
      logger.log(
        `... ${numberOfUsersBeingUpdated} users are already being updated. Waiting...`
      );
      waitCount++;
      return;
    }
  }

  const user = await getNextUserToUpdate();

  if (user === null) {
    logger.log("no users to update");
    return;
  }

  const response = await triggerUpdateListenHistoryByUserId(user.id);

  logger.log({
    message: "updating user",
    userId: user.id,
    listensToImport: response.listensToImport,
  });
}

/**
 * Updates all users in the database to set their `isUpdatingListeningHistory` field to false.
 * This function is typically used to reset the updating status of all users.
 *
 * @returns {Promise<void>} A promise that resolves when the update operation is complete.
 * @throws {Prisma.PrismaClientKnownRequestError} If the update operation fails.
 */
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
 * Get the number of users that are currently being updated
 *
 * @returns {Promise<number>} A promise that resolves with the number of users being updated
 */
function getNumberOfUsersBeingUpdated(): Promise<number> {
  return prisma.user.count({
    where: {
      isUpdatingListeningHistory: true,
    },
  });
}

/**
 * Retrieves the next user from the database who is not currently being updated.
 * The user is selected based on the `lastUpdatedListeningHistoryAt` field, with the user who was updated the longest time ago being selected first.
 * This function uses a transaction to ensure that the same user is not selected by multiple concurrent operations.
 *
 * @returns {Promise<User | null>} A promise that resolves with the next user to update, or null if there are no more users to update.
 * @throws {Prisma.PrismaClientKnownRequestError} If the query fails.
 */
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
