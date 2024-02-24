import { PrismaClient } from "@prisma/client";
import {
  createUserByLastfmUsername,
  getAllUsers,
  getUserById,
} from "../users.service";
import { TypedError } from "../../errors/errors.types";
import { clearEntireDatabase } from "../../utils/test.utils";

const prisma = new PrismaClient();

/* Test
 * 1. No Users
 *  - [X] Returns empty array
 * 2. Create User
 * - [X] Can Create User with Valid Lastfm Username
 * - [X] Cannot Create User with Invalid Lastfm Username
 * - [X] Create Duplicate User does not add new user to db
 * 3. Get User
 * - [X] Can Get User by Id
 * - [X] Cannot Get a User that doesn't exist
 */
describe("User Service", () => {
  //  let consoleError;
  let consoleError = jest
    .spyOn(global.console, "error")
    .mockImplementation(() => {});

  beforeAll(async () => {
    // clear all users
    await clearEntireDatabase();
  });

  afterAll(async () => {
    // restore console.error
    consoleError.mockRestore();

    // clear all users
    await clearEntireDatabase();
  });

  afterEach(() => {
    consoleError.mockClear();
  });

  it("returns empty array when no users", async () => {
    const users = await getAllUsers();
    expect(users).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("can create user with valid lastfm username", async () => {
    const user = await createUserByLastfmUsername("atomicGravy");
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("lastfmAccount");
    if (user.lastfmAccount) {
      expect(user.lastfmAccount).toHaveProperty("username", "atomicGravy");
    }

    const newUser = await prisma.user.findMany({
      where: { lastfmAccount: { username: "atomicGravy" } },
    });
    expect(newUser.length).toEqual(1);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("cannot create duplicate user", async () => {
    const user1 = await createUserByLastfmUsername("mathwho");
    const user2 = await createUserByLastfmUsername("mathwho");
    expect(user1).toEqual(user2);
    const newUser = await prisma.user.findMany({
      where: { lastfmAccount: { username: "mathwho" } },
    });
    expect(newUser.length).toEqual(1);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("cannot create user with invalid lastfm username", async () => {
    await expect(
      createUserByLastfmUsername("invalidUsername12")
    ).rejects.toThrow(TypedError);
    await expect(
      createUserByLastfmUsername("invalidUsername12")
    ).rejects.toHaveProperty("status", 404);

    const newUser = await prisma.user.findMany({
      where: { lastfmAccount: { username: "invalidUsername12" } },
    });
    expect(newUser.length).toEqual(0);

    expect(consoleError).toHaveBeenCalled();
  });

  it("can get user by id", async () => {
    const user = await createUserByLastfmUsername("atomicGravy");
    const userFromDb = await getUserById(user.id);
    expect(userFromDb).toEqual(user);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("cannot get users that don't exist", async () => {
    await expect(getUserById(999999999)).rejects.toThrow(TypedError);
    await expect(getUserById(999999999)).rejects.toHaveProperty("status", 404);
    expect(consoleError).toHaveBeenCalled();
  });
});
