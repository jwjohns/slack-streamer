export function minIntervalMs(maxPerMinute: number) {
  if (!maxPerMinute || maxPerMinute <= 0) return 0;
  return Math.ceil(60000 / maxPerMinute);
}
