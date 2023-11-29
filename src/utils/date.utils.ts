export function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function unixTimestampToDate(unixTimestamp: number): Date {
  return new Date(unixTimestamp * 1000);
}
