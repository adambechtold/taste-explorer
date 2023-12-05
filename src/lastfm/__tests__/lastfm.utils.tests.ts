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

  // createLastfmListensFromRecentTracks
  it("can create lastfm listens from valid response", () => {
    const response = {
      recenttracks: {
        "@attr": ResponseExamples.userField,
        track: [ResponseExamples.validTrackResponse],
      },
    };

    const lastfmListens =
      LastfmUtils.createLastfmListensFromRecentTracks(response);
    const expectedListens = [
      {
        date: new Date(123456789 * 1000),
        track: {
          mbid: "123456789",
          name: "Atomic Gravy",
          url: "https://www.last.fm/music/Atomic+Gravy/_/Atomic+Gravy",
          artist: {
            mbid: "123456789",
            name: "Atomic Gravy",
          },
          album: {
            mbid: "123456789",
            name: "Atomic Gravy",
          },
        },
      },
    ];
    expect(lastfmListens).toEqual(expectedListens);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("filters out tracks without mbids", () => {
    const response = {
      recenttracks: {
        "@attr": ResponseExamples.userField,
        track: [ResponseExamples.trackResponseMissingMbid],
      },
    };

    let lastfmListens =
      LastfmUtils.createLastfmListensFromRecentTracks(response);
    expect(lastfmListens).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();

    response.recenttracks.track.push(ResponseExamples.validTrackResponse);
    lastfmListens = LastfmUtils.createLastfmListensFromRecentTracks(response);
    const expectedListens = [
      {
        date: new Date(123456789 * 1000),
        track: {
          mbid: "123456789",
          name: "Atomic Gravy",
          url: "https://www.last.fm/music/Atomic+Gravy/_/Atomic+Gravy",
          artist: {
            mbid: "123456789",
            name: "Atomic Gravy",
          },
          album: {
            mbid: "123456789",
            name: "Atomic Gravy",
          },
        },
      },
    ];
    expect(lastfmListens).toEqual(expectedListens);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
