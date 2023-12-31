import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

export async function clearEntireDatabase(): Promise<Prisma.BatchPayload[]> {
  const results = [await prisma.lastfmListen.deleteMany()];

  results.push(await prisma.lastfmAccount.deleteMany());
  results.push(await prisma.artist.deleteMany());
  results.push(await prisma.listen.deleteMany());
  results.push(await prisma.track.deleteMany());
  results.push(await prisma.user.deleteMany());

  return results;
}
