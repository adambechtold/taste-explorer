export function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function unixTimestampToDate(unixTimestamp: number): Date {
  return new Date(unixTimestamp * 1000);
}

export function secondsToTimeFormat(seconds: number) {
  var minutes = Math.floor(seconds / 60);
  var remainingSeconds = seconds % 60;
  return minutes + ":" + (remainingSeconds < 10 ? "0" : "") + remainingSeconds;
}
