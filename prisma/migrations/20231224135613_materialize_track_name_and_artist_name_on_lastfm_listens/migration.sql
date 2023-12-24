-- AlterTable
ALTER TABLE `LastfmListen` ADD COLUMN `artistName` VARCHAR(320) NULL,
    ADD COLUMN `trackName` VARCHAR(320) NULL;

UPDATE `LastfmListen` SET `artistName` = trackData->>'$.artist.name', `trackName` = trackData->>'$.name';