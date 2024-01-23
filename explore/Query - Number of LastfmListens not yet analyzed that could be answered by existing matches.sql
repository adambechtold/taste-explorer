-- Number of LastfmListens that could be analyzed using data we already have
-- 2024.01.23 - 128,858
SELECT
	count(*)
FROM
	LastfmListen
	INNER JOIN (
		SELECT
			a.trackName,
			a.artistName
		FROM ( SELECT DISTINCT
				trackName,
				artistName
			FROM
				LastfmListen
			WHERE
				analyzedAt IS NULL) AS a -- Tracks Not Yet Analyzed
			INNER JOIN ( SELECT DISTINCT
					trackName, artistName
				FROM
					LastfmListen
					JOIN `Listen` ON `Listen`.lastfmListenId = LastfmListen.id) AS b -- Tracks Analyzed
				ON a.trackName = b.trackName
					AND a.artistName = b.artistName) AS PartiallyAnalyzed ON LastfmListen.trackName = PartiallyAnalyzed.trackName
	AND LastfmListen.artistName = PartiallyAnalyzed.artistName
WHERE
	LastfmListen.analyzedAt IS NULL;


-- Number of LastfmListens not yet analyzed
-- 2024.01.23 - 643,111
SELECT
	count(*)
FROM
	LastfmListen
WHERE
	analyzedAt IS NULL;


-- Effect - 20% reduction in the number of Spotify API requests
-- 📍 Position - The portion of spotify api request avoided will grow over time

