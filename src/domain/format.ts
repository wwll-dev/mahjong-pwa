export function formatPoints(n: number): string {
  if (n > 0) return `+${n}`;
  return `${n}`;
}
