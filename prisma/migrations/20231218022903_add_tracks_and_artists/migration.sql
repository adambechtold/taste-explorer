-- CreateTable
CREATE TABLE `Track` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `spotifyId` VARCHAR(191) NOT NULL,
    `mbid` VARCHAR(191) NULL,
    `interationalRecordingCode` VARCHAR(191) NULL,
    `interationalArticleNumber` VARCHAR(191) NULL,
    `universalProductCode` VARCHAR(191) NULL,
    `acousticness` DOUBLE NULL,
    `danceability` DOUBLE NULL,
    `durationMs` INTEGER NULL,
    `energy` DOUBLE NULL,
    `instrumentalness` DOUBLE NULL,
    `key` INTEGER NULL,
    `liveness` DOUBLE NULL,
    `loudness` DOUBLE NULL,
    `mode` ENUM('Major', 'Minor') NULL,
    `speechiness` DOUBLE NULL,
    `tempo` DOUBLE NULL,
    `timeSignature` INTEGER NULL,
    `valence` DOUBLE NULL,

    UNIQUE INDEX `Track_spotifyId_key`(`spotifyId`),
    UNIQUE INDEX `Track_mbid_key`(`mbid`),
    UNIQUE INDEX `Track_interationalRecordingCode_key`(`interationalRecordingCode`),
    UNIQUE INDEX `Track_interationalArticleNumber_key`(`interationalArticleNumber`),
    UNIQUE INDEX `Track_universalProductCode_key`(`universalProductCode`),
    INDEX `Track_spotifyId`(`spotifyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Artist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `spotifyId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Artist_spotifyId_key`(`spotifyId`),
    INDEX `Artist_spotifyId`(`spotifyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ArtistToTrack` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ArtistToTrack_AB_unique`(`A`, `B`),
    INDEX `_ArtistToTrack_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
