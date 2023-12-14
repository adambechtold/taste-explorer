SELECT
	songAndArtist,
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
HAVING user1Count > 3 AND user2Count > 3;