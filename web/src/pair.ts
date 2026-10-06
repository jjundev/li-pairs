import type { Leg, Pair } from './types';

export function pickLegs(p: Pair, long: string | null, short: string | null): { long: Leg; short: Leg } {
  return {
    long: p.longs.find((l) => l.symbol === long) ?? p.longs[0],
    short: p.shorts.find((s) => s.symbol === short) ?? p.shorts[0],
  };
}

export const isAsymmetric = (a: Leg, b: Leg): boolean => Math.abs(a.mult) !== Math.abs(b.mult);

export function multLabel(m: number): string {
  return `${m > 0 ? '+' : '−'}${Math.abs(m)}x`;
}

export function filterPairs(pairs: Pair[], q: string): Pair[] {
  const s = q.trim().toLowerCase();
  if (!s) return pairs;
  return pairs.filter((p) =>
    [p.underlying, p.id, ...[...p.longs, ...p.shorts].flatMap((l) => [l.symbol, l.name])].some((t) =>
      t.toLowerCase().includes(s),
    ),
  );
}

export function pairAvailable(p: Pair): boolean {
  const { long, short } = pickLegs(p, null, null);
  return long.available && short.available;
}
