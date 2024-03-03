-- CreateTable
CREATE TABLE `SpotifyTrackSearchQueue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `trackName` VARCHAR(191) NOT NULL,
    `artistName` VARCHAR(191) NOT NULL,
    `searchedAt` DATETIME(3) NULL,
    `trackId` INTEGER NULL,

    UNIQUE INDEX `SpotifyTrackSearchQueue_trackName_artistName_unique`(`trackName`, `artistName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
