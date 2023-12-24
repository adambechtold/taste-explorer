SELECT
	concat(trackName, ' by ', artistName) AS track,
	count(*) AS trackCount
FROM
	LastfmListen
GROUP BY
	track
ORDER BY
	trackCount DESC;