import createServer from "../src/utils/server";
import { PrismaClient } from "@prisma/client";
import supertest from "supertest";

const app = createServer();
const prisma = new PrismaClient();

/* Test User Routes
  * Create User Route 
  * - [ ] Can Create User with Valid Lastfm Username
  * - [ ] Cannot Create User with Invalid Lastfm Username
  * - [ ] Create Duplicate User does not add new user to db
  * - [X] Fail to provide username
  * - [X] Provide invalid username argument (is a number, is an object)

  * Get User By ID
  * - [ ] Can Get User by Id
  * - [X] Cannot Get a User that doesn't exist
  * - [X] Provide invalid id argument (is a string)
  * 
*/

describe("User Routes", () => {
  let consoleError = jest
    .spyOn(global.console, "error")
    .mockImplementation(() => {});
  beforeAll(async () => {
    // clear all users
    await prisma.lastfmAccount.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // restore console.error
    consoleError.mockRestore();

    // clear all users
    await prisma.lastfmAccount.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    consoleError.mockClear();
  });

  describe("Get User Routes", () => {
    describe("Given: no users exist in the database", () => {
      it("it should return a 404 if asked for a specific user", async () => {
        const id = 1;
        await supertest(app).get(`/api/users/${id}`).expect(404);
      });

      it("it should provide an error message if provided an invalid id", async () => {
        const id = "invalidId";
        await supertest(app).get(`/api/users/${id}`).expect(400);
        expect(consoleError).not.toHaveBeenCalled();
      });
    });
  });

  describe("Create User Routes", () => {
    describe("Given: no users exist in the database", () => {
      it("it should raise an error if no lastfmUsername is provided", async () => {
        await supertest(app).post(`/api/users`).expect(400);
        expect(consoleError).not.toHaveBeenCalled();
      });

      it("it should raise an error if other arguments are provided, but not lastfmUsername", async () => {
        await supertest(app)
          .post(`/api/users`)
          .send({ username: "test" })
          .expect(400);
        expect(consoleError).not.toHaveBeenCalled();
        await supertest(app)
          .post(`/api/users`)
          .send({ lastfm: { username: "test" } })
          .expect(400);
        expect(consoleError).not.toHaveBeenCalled();
      });
    });
  });
});
