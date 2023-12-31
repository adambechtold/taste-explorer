import { PrismaClient } from "@prisma/client";
import { PrismaTransactionClient } from "../utils/prisma.types";

const prisma = new PrismaClient({ log: ["error"] });

export async function markUserUpdatingHistoryStatus(
  userId: number,
  isUpdating: boolean,
  tx: PrismaTransactionClient = prisma
) {
  await tx.user.update({
    where: {
      id: userId,
    },
    data: {
      isUpdatingListeningHistory: isUpdating,
    },
  });
}
