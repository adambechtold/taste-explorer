SELECT
	COALESCE(added.Hour, b.Hour) AS `Hour`,
	`Lastfm Listens Added`,
	`Lastfm Listens Analyzed`
FROM (
	SELECT
		DATE_FORMAT(createdAt, '%Y-%m-%d %H') AS `Hour`,
		count(*) AS `Lastfm Listens Added`
	FROM
		LastfmListen
	WHERE
		createdAt > NOW() - INTERVAL 1 day
	GROUP BY
		`Hour`
	ORDER BY
		`Hour`) added
	LEFT JOIN (
		SELECT
			DATE_FORMAT(analyzedAt, '%Y-%m-%d %H') AS `Hour`,
			count(*) AS `Lastfm Listens Analyzed`
		FROM
			LastfmListen
		WHERE
			analyzedAt > NOW() - INTERVAL 1 day
		GROUP BY
			`Hour`
		ORDER BY
			`Hour`) b ON added.Hour = b.Hour
UNION
SELECT
	COALESCE(added.Hour, b.Hour) AS `Hour`,
	`Lastfm Listens Added`,
	`Lastfm Listens Analyzed`
FROM (
	SELECT
		DATE_FORMAT(createdAt, '%Y-%m-%d %H') AS `Hour`,
		count(*) AS `Lastfm Listens Added`
	FROM
		LastfmListen
	WHERE
		createdAt > NOW() - INTERVAL 1 day
	GROUP BY
		`Hour`
	ORDER BY
		`Hour`) added
	RIGHT JOIN (
		SELECT
			DATE_FORMAT(analyzedAt, '%Y-%m-%d %H') AS `Hour`,
			count(*) AS `Lastfm Listens Analyzed`
		FROM
			LastfmListen
		WHERE
			analyzedAt > NOW() - INTERVAL 1 day
		GROUP BY
			`Hour`
		ORDER BY
			`Hour`) b ON added.Hour = b.Hour;
