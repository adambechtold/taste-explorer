export class Logger {
  channel: string = "default";

  constructor(channel: string | undefined = undefined) {
    if (channel) {
      this.channel = channel;
    }
  }

  log(...args: any[]) {
    const date: any = new Date();
    const time = date.toISOString();
    console.log(`[${time}] - ${this.channel}: `, ...args);
  }
}
