import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function clearEntireDatabase() {
  // clear all users
  await prisma.listen.deleteMany();
  await prisma.track.deleteMany();
  await Promise.all([prisma.artist.deleteMany(), prisma.album.deleteMany()]);
  await prisma.lastfmAccount.deleteMany();
  await prisma.user.deleteMany();
}
