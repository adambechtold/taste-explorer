SELECT
	*
FROM
	LastfmListen
WHERE
	listenedAt in(
		SELECT
			listenedAt FROM (
				SELECT
					userId, listenedAt, count(*) AS listenCount FROM LastfmListen
				WHERE
					LastfmListen.userId = 285
				GROUP BY
					userId, listenedAt
				HAVING
					ListenCount > 1) AS duplicateListens)
ORDER BY
	listenedAt;

SELECT
	userId,
	listenedAt,
	JSON_EXTRACT(trackData, '$.name') AS trackName,
	count(*) AS listenCount
FROM
	LastfmListen
GROUP BY
	userId,
	listenedAt,
	trackName
HAVING
	listenCount > 1
ORDER BY
	listenCount DESC;