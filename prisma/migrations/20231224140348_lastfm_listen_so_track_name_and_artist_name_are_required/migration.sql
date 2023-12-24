/*
  Warnings:

  - Made the column `artistName` on table `LastfmListen` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trackName` on table `LastfmListen` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `LastfmListen` MODIFY `artistName` VARCHAR(320) NOT NULL,
    MODIFY `trackName` VARCHAR(320) NOT NULL;
