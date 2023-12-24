import { PrismaClient } from "@prisma/client";
import * as UserService from "../../users/users.service";

const prisma = new PrismaClient();

export async function populateWithLastfmListens() {
  const [user1, user2] = await Promise.all([
    UserService.createUserByLastfmUsername("atomicGravy"),
    UserService.createUserByLastfmUsername("mathwho"),
  ]);

  await prisma.lastfmListen.createMany({
    data: [
      {
        userId: user1.id,
        listenedAt: new Date(1),
        trackName: "Test 1",
        artistName: "Test Artist 1",
        trackData: {},
      },
      {
        userId: user2.id,
        listenedAt: new Date(1),
        trackName: "Test 1",
        artistName: "Test Artist 1",
        trackData: {},
      },
      {
        userId: user1.id,
        listenedAt: new Date(2),
        trackName: "Test 3",
        artistName: "Test Artist 1",
        trackData: {},
      },
      {
        userId: user1.id,
        listenedAt: new Date(3),
        trackName: "Test 1",
        artistName: "Test Artist 2",
        trackData: {},
      },
    ],
  });
}
