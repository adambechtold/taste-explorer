import * as LastfmUtils from "../lastfm.utils";
import * as ResponseExamples from "../assets/lastfm.response.examples";

describe("lastfm Utils", () => {
  let consoleError = jest
    .spyOn(global.console, "error")
    .mockImplementation(() => {});

  afterEach(() => {
    consoleError.mockClear();
  });

  afterAll(() => {
    consoleError.mockRestore();
  });

  // createLastfmAccount
  it("can create lastfm account from valid response", () => {
    const response = {
      user: {
        name: "atomicGravy",
        registered: {
          unixtime: "123456789",
        },
        url: "https://www.last.fm/user/atomicGravy",
        playcount: "1234",
        track_count: "12345",
      },
    };
    const lastfmAccount = LastfmUtils.createLastfmAccount(response);
    expect(lastfmAccount).toEqual({
      username: "atomicGravy",
      registeredAt: new Date(123456789 * 1000),
      url: "https://www.last.fm/user/atomicGravy",
      playCount: 1234,
      trackCount: 12345,
    });
    expect(consoleError).not.toHaveBeenCalled();
  });
});
