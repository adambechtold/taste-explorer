/*
  Warnings:

  - You are about to drop the column `interationalArticleNumber` on the `Track` table. All the data in the column will be lost.
  - You are about to drop the column `interationalRecordingCode` on the `Track` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[internationalRecordingCode]` on the table `Track` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[internationalArticleNumber]` on the table `Track` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Track_interationalArticleNumber_key` ON `Track`;

-- DropIndex
DROP INDEX `Track_interationalRecordingCode_key` ON `Track`;

-- AlterTable
ALTER TABLE `Track` DROP COLUMN `interationalArticleNumber`,
    DROP COLUMN `interationalRecordingCode`,
    ADD COLUMN `internationalArticleNumber` VARCHAR(191) NULL,
    ADD COLUMN `internationalRecordingCode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Track_internationalRecordingCode_key` ON `Track`(`internationalRecordingCode`);

-- CreateIndex
CREATE UNIQUE INDEX `Track_internationalArticleNumber_key` ON `Track`(`internationalArticleNumber`);
