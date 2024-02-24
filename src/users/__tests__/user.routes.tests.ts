import createServer from "../../utils/server";
import supertest from "supertest";
import { createUserByLastfmUsername } from "../users.service";
import { clearEntireDatabase } from "../../utils/test.utils";

const app = createServer();

const API_KEY = process.env.API_SECRET || "test";
const API_KEY_HEADER = "x-api-token";

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

  * Get All Users
  * - [ ] Can Get All Users

  * Update User Listening History
  * - [ ] Can Update User Listening History of existing user
  * - [X] Cannot Update User Listening History of non-existing user
  * - [X] Error message for missing user id
  * - [X] Error message for invalid user id
*/

describe("User Routes", () => {
  let consoleError = jest
    .spyOn(global.console, "error")
    .mockImplementation(() => {});

  beforeAll(async () => {
    await clearEntireDatabase();
  });

  afterAll(async () => {
    // restore console.error
    consoleError.mockRestore();

    await clearEntireDatabase();
  });

  afterEach(() => {
    consoleError.mockClear();
  });

  describe("Get User Routes", () => {
    describe("Given: no users exist in the database", () => {
      it("it should require an API key", async () => {
        await supertest(app).get(`/api/users`).expect(401);
      });

      it("it should return a 404 if asked for a specific user", async () => {
        const id = 1;
        await supertest(app)
          .get(`/api/users/${id}`)
          .set(API_KEY_HEADER, API_KEY)
          .expect(404);
      });

      it("it should provide an error message if provided an invalid id", async () => {
        const id = "invalidId";
        await supertest(app)
          .get(`/api/users/${id}`)
          .set(API_KEY_HEADER, API_KEY)
          .expect(400);
        expect(consoleError).not.toHaveBeenCalled();
      });
    });
  });

  describe("Create User Routes", () => {
    describe("Given: no users exist in the database", () => {
      it("it should require an API key", async () => {
        await supertest(app).post(`/api/users`).expect(401);
        expect(consoleError).not.toHaveBeenCalled();
      });

      it("it should raise an error if no lastfmUsername is provided", async () => {
        await supertest(app)
          .post(`/api/users`)
          .set(API_KEY_HEADER, API_KEY)
          .expect(400);
        expect(consoleError).not.toHaveBeenCalled();
      });

      it("it should raise an error if other arguments are provided, but not lastfmUsername", async () => {
        await supertest(app)
          .post(`/api/users`)
          .set(API_KEY_HEADER, API_KEY)
          .send({ username: "test" })
          .expect(400);
        expect(consoleError).not.toHaveBeenCalled();
        await supertest(app)
          .post(`/api/users`)
          .set(API_KEY_HEADER, API_KEY)
          .send({ lastfm: { username: "test" } })
          .expect(400);
        expect(consoleError).not.toHaveBeenCalled();
      });
    });
  });

  describe("Update User Listening Routes", () => {
    describe("Given: there is a user in the database", () => {
      beforeAll(async () => {
        await createUserByLastfmUsername("atomicGravy");
      });

      it("it should require an API key", async () => {
        await supertest(app).post(`/api/users/9999999/listens`).expect(401);
      });

      it("it should raise an error if it provides the id of a user that doesn't exist", async () => {
        await supertest(app)
          .post(`/api/users/9999999/listens`)
          .set(API_KEY_HEADER, API_KEY)
          .expect(404);
        expect(consoleError).toHaveBeenCalled();
      });

      it("it should raise an error if it provides an invalid id (string)", async () => {
        await supertest(app)
          .post(`/api/users/invalidId/listens`)
          .set(API_KEY_HEADER, API_KEY)
          .expect(400);
        expect(consoleError).not.toHaveBeenCalled();
      });

      it("it should raise an error if no user is provided", async () => {
        await supertest(app)
          .post(`/api/users/listens`)
          .set(API_KEY_HEADER, API_KEY)
          .expect(404);
        expect(consoleError).not.toHaveBeenCalled();
      });
    });
  });
});
