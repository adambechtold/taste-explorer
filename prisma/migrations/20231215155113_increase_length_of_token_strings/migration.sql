-- AlterTable
ALTER TABLE `AccessToken` MODIFY `token` VARCHAR(255) NOT NULL,
    MODIFY `refreshToken` VARCHAR(255) NOT NULL;
