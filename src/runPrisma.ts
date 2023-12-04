import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function createUser() {
  const user = await prisma.user.create({
    data: {
      lastfmAccount: {
        create: {
          username: "max",
          registeredAt: new Date(),
          url: "test url",
          playCount: 1000,
          trackCount: 10,
        },
      },
    },
  });
  console.dir(user, { depth: null });
}

async function reset() {
  const deletedFmAccounts = await prisma.lastfmAccount.deleteMany();
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

runPrismaOperation(createUser);
