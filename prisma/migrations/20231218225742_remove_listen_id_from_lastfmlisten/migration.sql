/*
  Warnings:

  - You are about to drop the column `listenId` on the `LastfmListen` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `LastfmListen_listenId_key` ON `LastfmListen`;

-- AlterTable
ALTER TABLE `LastfmListen` DROP COLUMN `listenId`;
