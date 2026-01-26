export function diffAppend(prev: string, next: string): string {
  if (next === prev) return "";
  if (next.startsWith(prev)) return next.slice(prev.length);
  return next;
}
