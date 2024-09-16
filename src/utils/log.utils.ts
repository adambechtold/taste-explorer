type Channel =
  | "default"
  | "updateListeningHistory"
  | "createListens"
  | "addFeaturesToTracks"
  | "searchSpotifyForTracks";

export class Logger {
  channel: Channel = "default";

  constructor(channel: Channel | undefined = undefined) {
    if (channel) {
      this.channel = channel;
    }
  }

  log(...args: any[]) {
    const date: any = new Date();
    const time = date.toISOString();
    console.log(`[${time}] - ${this.channel}: `, ...args);
  }

  error(...args: any[]) {
    const date: any = new Date();
    const time = date.toISOString();
    console.error(`[${time}] - ${this.channel}: `, ...args);
  }

  warn(...args: any[]) {
    const date: any = new Date();
    const time = date.toISOString();
    console.warn(`[${time}] - ${this.channel}: `, ...args);
  }
}
