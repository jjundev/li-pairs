// zone: 진입가 p0 에서 e^(±√Σℓ²) 로 넓어지는 손익분기 띠. 지수가 띠 밖이면 1:1 레버리지·인버스 페어가 이익.
import type { Bar } from './types';

export interface Row { d: number; p: number; l: number; s: number }
export interface Day { d: number; p: number; pnl: number; lo: number; hi: number; out: boolean; reset: boolean }
export interface Win { d: number; pnl: number; out: boolean }
export interface Group { n: number; mean: number; win: number }
export interface Summary { n: number; escape: number; out: Group; in: Group; all: Group }

export const MIN_ROWS = 250;
export const COST = 0.0003;

export function align(index: Bar[], long: Bar[], short: Bar[]): Row[] {
  const L = new Map(long.map((b) => [b[0], b[4]]));
  const S = new Map(short.map((b) => [b[0], b[4]]));
  return index
    .filter((b) => L.has(b[0]) && S.has(b[0]))
    .map((b) => ({ d: b[0], p: b[4], l: L.get(b[0])!, s: S.get(b[0])! }))
    .sort((a, b) => a.d - b.d);
}

export function defaultStart(rows: Row[]): number {
  if (!rows.length) return 0;
  const from = rows[rows.length - 1].d - 100000;
  return Math.max(0, rows.findIndex((r) => r.d >= from));
}

export function startIndex(rows: Row[], from: number | null): number {
  if (from === null || !rows.length || from < rows[0].d || from > rows[rows.length - 1].d) return defaultStart(rows);
  return rows.findIndex((r) => r.d >= from);
}

export function simulate(rows: Row[], start: number, gap: number): Day[] {
  const days: Day[] = [];
  let L = 0.5, S = 0.5, cash = 0, p0 = rows[start]?.p, q = 0;
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    let reset = false;
    if (i > start) {
      const prev = rows[i - 1];
      L *= r.l / prev.l;
      S *= r.s / prev.s;
      q += Math.log(r.p / prev.p) ** 2;
      if (gap > 0 && Math.abs(L - S) / (L + S) > gap) {
        const sold = Math.abs(L - S);
        cash += sold * (1 - COST);
        L = S = Math.min(L, S);
        p0 = r.p;
        q = 0;
        reset = true;
      }
    }
    const z = Math.sqrt(q);
    days.push({ d: r.d, p: r.p, pnl: L + S + cash - 1, lo: p0 * Math.exp(-z), hi: p0 * Math.exp(z),
      out: Math.abs(Math.log(r.p / p0)) > z, reset });
  }
  return days;
}

export function rolling(rows: Row[], start: number, h: number): Win[] {
  const q = [0];
  for (let i = 1; i < rows.length; i++) q.push(q[i - 1] + Math.log(rows[i].p / rows[i - 1].p) ** 2);
  const wins: Win[] = [];
  for (let a = start; a + h < rows.length; a++) {
    const b = a + h;
    wins.push({ d: rows[a].d, pnl: 0.5 * (rows[b].l / rows[a].l) + 0.5 * (rows[b].s / rows[a].s) - 1,
      out: Math.abs(Math.log(rows[b].p / rows[a].p)) > Math.sqrt(q[b] - q[a]) });
  }
  return wins;
}

function group(ws: Win[]): Group {
  if (!ws.length) return { n: 0, mean: NaN, win: NaN };
  return { n: ws.length, mean: ws.reduce((a, w) => a + w.pnl, 0) / ws.length,
    win: ws.filter((w) => w.pnl > 0).length / ws.length };
}

export function summarize(wins: Win[]): Summary {
  const out = wins.filter((w) => w.out);
  return { n: wins.length, escape: wins.length ? out.length / wins.length : NaN,
    out: group(out), in: group(wins.filter((w) => !w.out)), all: group(wins) };
}
