-- Create User
CREATE USER 'username'@'%' 
IDENTIFIED BY 'password';

-- Grant Read-only Access
GRANT SELECT ON taste_explorer.`User` to 'username'@'%';
GRANT SELECT ON taste_explorer.`Artist` to 'username'@'%'; 
GRANT SELECT ON taste_explorer.`Track` to 'username'@'%';
GRANT SELECT ON taste_explorer.`LastfmAccount` to 'username'@'%';
GRANT SELECT ON taste_explorer.`LastfmListen` to 'username'@'%';
GRANT SELECT ON taste_explorer.`Listen` to 'username'@'%';
GRANT SELECT ON taste_explorer.`_ArtistToTrack` to 'username'@'%';

-- Delete User
DROP USER 'username'@'%';

