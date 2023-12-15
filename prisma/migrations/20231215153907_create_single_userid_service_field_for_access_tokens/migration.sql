/*
  Warnings:

  - You are about to drop the column `service` on the `AccessToken` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `AccessToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userIdService]` on the table `AccessToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userIdService` to the `AccessToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `AccessToken_userId_service` ON `AccessToken`;

-- AlterTable
ALTER TABLE `AccessToken` DROP COLUMN `service`,
    DROP COLUMN `userId`,
    ADD COLUMN `userIdService` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `AccessToken_userIdService_key` ON `AccessToken`(`userIdService`);

-- CreateIndex
CREATE INDEX `AccessToken_userIdService` ON `AccessToken`(`userIdService`);
