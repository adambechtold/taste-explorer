/*
  Warnings:

  - You are about to drop the column `data` on the `LastfmListen` table. All the data in the column will be lost.
  - Added the required column `trackData` to the `LastfmListen` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `LastfmListen` DROP COLUMN `data`,
    ADD COLUMN `trackData` JSON NOT NULL;
