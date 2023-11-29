import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function createUser() {
  const user = await prisma.user.create({
    data: {
      name: "Adam",
      lastFmAccount: {
        create: {
          username: "adam",
          registeredTime: new Date(),
          url: "test url",
          playCount: 0,
          trackCount: 10,
        },
      },
    },
  });
  console.dir(user, { depth: null });
}

async function reset() {
  const deletedFmAccounts = await prisma.lastFmAccount.deleteMany();
  const deletedUsers = await prisma.user.deleteMany();
  console.log("deleted", deletedFmAccounts, deletedUsers);
}

function runPrismaOperation(fn: () => Promise<void>) {
  fn()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

runPrismaOperation(reset);
