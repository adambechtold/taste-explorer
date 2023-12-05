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

async function createArtists() {
  const artistResult = await prisma.artist.createMany({
    data: [
      {
        mbid: "f0410667-a245-494b-887b-a81ba45d783d",
        name: "Chris James",
      },
      {
        mbid: "6925db17-f35e-42f3-a4eb-84ee6bf5d4b0",
        name: "Olivia Rodrigo",
      },
    ],
    skipDuplicates: true,
  });
  console.log("artistResult", artistResult);
}

runPrismaOperation(createArtists);
// npx ts-node src/runPrisma.ts
