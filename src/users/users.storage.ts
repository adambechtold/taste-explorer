import { PrismaClient, User } from "@prisma/client";
import { Logger } from "../utils/log.utils";

const prisma = new PrismaClient({ log: ["error"] });
const logger = new Logger("updateListeningHistory");

export async function markUserUpdatingHistoryStatus(
  userId: number,
  isUpdating: boolean,
  newLastUpdatedHistoryAt?: Date,
) {
  return prisma.$transaction(async (tx) => {
    logger.log(
      `Marking user ${userId} as ${
        isUpdating ? "updating" : "not updating"
      } listening history`,
    );
    const users =
      (await tx.$queryRaw`SELECT * FROM User WHERE id = ${userId} FOR UPDATE`) as User[];

    if (users.length === 0) {
      throw new Error(`Could not find user with id ${userId}`);
    }

    const user = users[0];

    return await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        isUpdatingListeningHistory: isUpdating,
        lastUpdatedListeningHistoryAt: newLastUpdatedHistoryAt,
      },
    });
  });
}
