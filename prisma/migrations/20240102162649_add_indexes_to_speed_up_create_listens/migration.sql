-- CreateIndex
CREATE INDEX `LastfmListen_trackName_artistName` ON `LastfmListen`(`trackName`, `artistName`);

-- CreateIndex
CREATE INDEX `LastfmListen_isBeingAnalyzed` ON `LastfmListen`(`isBeingAnalyzed`);
