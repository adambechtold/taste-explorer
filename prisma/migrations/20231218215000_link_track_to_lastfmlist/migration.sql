-- AlterTable
ALTER TABLE `LastfmListen` ADD COLUMN `trackId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `LastfmListen_trackId` ON `LastfmListen`(`trackId`);
