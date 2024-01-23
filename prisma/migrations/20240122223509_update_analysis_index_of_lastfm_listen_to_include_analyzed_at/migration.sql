-- DropIndex
DROP INDEX `LastfmListen_isBeingAnalyzed` ON `LastfmListen`;

-- CreateIndex
CREATE INDEX `LastfmListen_isBeingAnalyzed_analyzedAt` ON `LastfmListen`(`isBeingAnalyzed`, `analyzedAt`);
