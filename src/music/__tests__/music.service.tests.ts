import { TypedError } from "../../errors/errors.types";
import { UserWithId } from "../../users/users.types";
import * as MusicService from "../music.service";

describe("Music Service", () => {
  describe("Trigger Update Listens for User", () => {
    let consoleError = jest
      .spyOn(global.console, "error")
      .mockImplementation(() => {});

    beforeEach(() => {
      consoleError.mockClear();
    });

    afterAll(() => {
      consoleError.mockRestore();
    });

    it("throws an error if the user doesn't have a lastfmAccount", async () => {
      const user: UserWithId = {
        id: 1,
      };

      try {
        await MusicService.triggerUpdateListensForUser(user);
      } catch (error) {
        if (error instanceof TypedError) {
          expect(error.message).toEqual(
            "Cannot trigger update listens for user without lastfm account.",
          );
          expect(error.status).toEqual(400);
        } else {
          throw error;
        }
      }
    });
  });
});
