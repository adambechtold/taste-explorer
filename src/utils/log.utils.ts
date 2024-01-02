export function log(...args: any[]) {
  const date: any = new Date();
  const time = date.toISOString();
  console.log(`[${time}]`, ...args);
}
