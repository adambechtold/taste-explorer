-- AlterTable
ALTER TABLE `User` ADD COLUMN `isUpdatingListeningHistory` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastUpdatedListeningHistoryAt` DATETIME(3) NULL;
