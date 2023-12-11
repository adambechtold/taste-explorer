SELECT
	songAndArtist,
	sum(CASE WHEN userId = 1 THEN
		listenCount
	ELSE
		0
	END) AS atomicgravyCount,
	sum(CASE WHEN userId = 2 THEN
		listenCount
	ELSE
		0
	END) AS mathwhoCount
FROM (
	SELECT
		userId,
		concat(JSON_EXTRACT(trackData, '$.name'), ' | by | ', JSON_EXTRACT(trackData, '$.artist.name')) AS songAndArtist,
		count(userId) AS listenCount
	FROM
		LastfmListen
	WHERE
		userId = 1
		OR userId = 2
	GROUP BY
		userId,
		songAndArtist) AS songCounts
GROUP by songAndArtist
having atomicgravyCount > 3 and mathwhoCount > 5;