SELECT
	count(LastfmListen.id) AS numberOfLastFmListens,
	count(Listen.lastfmListenId) AS numberOfListens,
	count(Listen.id) / count(LastfmListen.id) * 100 AS percentCoverage
FROM
	LastfmListen
	LEFT JOIN `Listen` ON Listen.lastfmListenId = LastfmListen.id;