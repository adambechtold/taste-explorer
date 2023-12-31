import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

export async function markUserUpdatingHistoryStatus(
  userId: number,
  isUpdating: boolean,
  newLastUpdatedHistoryAt?: Date
) {
  return prisma.$transaction(async (tx) => {
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
