import * as LastfmAPI from "../lastfm.api";

describe("lastfm API", () => {
  describe("getAccountInfo", () => {
    it("returns the expected response", async () => {
      const response = await LastfmAPI.getAccountInfo("atomicGravy");
      expect(response).toHaveProperty("user");
      expect(response.user).toHaveProperty("name", "atomicGravy");
      expect(response.user).toHaveProperty("registered");
      expect(response.user.registered).toHaveProperty("unixtime");
      expect(response.user).toHaveProperty(
        "url",
        "https://www.last.fm/user/atomicGravy"
      );
      expect(response.user).toHaveProperty("playcount");
      expect(response.user).toHaveProperty("track_count");
    });
  });

  describe("getRecentTracks", () => {
    it("returns the expected response", async () => {
      const response = await LastfmAPI.getRecentTracks("atomicGravy", 1, 1);
      expect(response).toHaveProperty("recenttracks");
      expect(response.recenttracks).toHaveProperty("track");
      expect(response.recenttracks.track.length).toBeLessThanOrEqual(2); // if something is playing, there will be 2 tracks
      expect(response.recenttracks).toHaveProperty("@attr");
      expect(response.recenttracks["@attr"]).toHaveProperty(
        "user",
        "atomicGravy"
      );
      expect(response.recenttracks["@attr"]).toHaveProperty("page", "1");
      expect(response.recenttracks["@attr"]).toHaveProperty("perPage", "1");
      expect(response.recenttracks["@attr"]).toHaveProperty("total");
      expect(response.recenttracks["@attr"]).toHaveProperty("totalPages");
    });
  });
});
