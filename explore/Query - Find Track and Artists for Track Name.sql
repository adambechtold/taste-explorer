-- Find Track and Artists for Track Name
SELECT
	Track.id,
	Track.name,
	GROUP_CONCAT(Artist.name SEPARATOR ', ') AS artists
FROM
	Track
	JOIN _ArtistToTrack ON _ArtistToTrack.B = Track.id
	JOIN Artist ON _ArtistToTrack.A = Artist.id
WHERE
	Track.name = 'Tongue Tied'
group by Track.id, Track.name;