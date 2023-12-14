import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function clearEntireDatabase() {
  // clear all users
  await prisma.lastfmListen.deleteMany();
  await prisma.lastfmAccount.deleteMany();
  await prisma.user.deleteMany();
}
