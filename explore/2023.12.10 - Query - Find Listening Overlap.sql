SELECT
    songNameAndArtist,
    sum(CASE WHEN userId = 1 THEN
      listenCount
    ELSE
      0
    END) AS user1Count,
    sum(CASE WHEN userId = 2 THEN
      listenCount
    ELSE
      0
    END) AS user2Count
  FROM (
    SELECT
      userId,
      concat(trackName, ' | by | ', artistName) AS songNameAndArtist,
      count(userId) AS listenCount
    FROM
      LastfmListen
    WHERE
      userId = 1
      OR userId = 2
    GROUP BY
      userId,
      songNameAndArtist) AS songCounts
  GROUP by songNameAndArtist
  HAVING user1Count >= 3 AND user2Count >= 3;

