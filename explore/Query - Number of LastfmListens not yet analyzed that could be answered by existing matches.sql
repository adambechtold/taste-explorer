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


--
-- Portion of songs that are mismatched
--
-- Number of Listenes whose Track's Name does not exactly match the Lastfm Listen's Track Name
-- 2024.01.23 - 95,815

SELECT
	count(*)
FROM
	LastfmListen
	JOIN `Listen` ON `Listen`.lastfmListenId = LastfmListen.id
	JOIN Track ON Track.id = `Listen`.id
WHERE
	trackName != Track. `name`;

-- Total Number of Listens
-- 2024.01.23 - 1,039,043
SELECT
	count(*)
FROM
	`Listen`;