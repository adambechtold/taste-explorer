import { TypedError } from "../errors/errors.types";
import { UserWithId } from "../users/users.types";
import { LastfmListenBatchImportSize } from "../lastfm/lastfm.types";

import * as LastfmService from "../lastfm/lastfm.service";

export async function triggerUpdateListensForUser(
  user: UserWithId
): Promise<LastfmListenBatchImportSize> {
  if (!user.lastfmAccount) {
    throw new TypedError(
      `Cannot trigger update listens for user without lastfm account.`,
      400
    );
  }

  // trigger LastfmService to fetch all listens for user
  const lastfmUpdateTracker = await LastfmService.updateUserListeningHistory(
    user
  );

  return new Promise((resolve, reject) => {
    lastfmUpdateTracker.onStart((size) => {
      resolve(size);
    });
  });
}
