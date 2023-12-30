-- Find Mismatches Between LastfmListen and the Track in Spotify
SELECT
	tracksAndArtists.trackId,
	tracksAndArtists.trackName,
	tracksAndArtists.artistNames,
	LastfmListen.trackName,
	LastfmListen.artistName
FROM (
	SELECT
		Track.id AS trackId,
		Track.name as trackName,
		GROUP_CONCAT(Artist.name SEPARATOR ', ') AS artistNames
	FROM
		Track
		JOIN _ArtistToTrack ON _ArtistToTrack.B = Track.id
		JOIN Artist ON _ArtistToTrack.A = Artist.id
	GROUP BY
		Track.id,
		Track.name) AS tracksAndArtists
	JOIN `Listen` ON `Listen`.trackId = tracksAndArtists.trackId
	JOIN LastfmListen ON LastfmListen.id = `Listen`.lastfmListenId
WHERE
	LastfmListen.trackName != tracksAndArtists.trackName;
