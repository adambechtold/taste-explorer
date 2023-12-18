/*
  Warnings:

  - You are about to drop the column `trackId` on the `LastfmListen` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[listenId]` on the table `LastfmListen` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `LastfmListen_trackId` ON `LastfmListen`;

-- AlterTable
ALTER TABLE `LastfmListen` DROP COLUMN `trackId`,
    ADD COLUMN `listenId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Listen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `listenedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `trackId` INTEGER NOT NULL,
    `lastfmListenId` INTEGER NULL,

    UNIQUE INDEX `Listen_lastfmListenId_key`(`lastfmListenId`),
    INDEX `Listen_userId`(`userId`),
    INDEX `Listen_trackId`(`trackId`),
    INDEX `Listen_lastfmListenId`(`lastfmListenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `LastfmListen_listenId_key` ON `LastfmListen`(`listenId`);
