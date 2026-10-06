import { resample, TF_LABEL } from './resample';
import type { Bar, Timeframe } from './types';

export function toTime(d: number): string {
  const s = String(d);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

export function commonStart(a: Bar[], b: Bar[]): [Bar[], Bar[]] {
  if (!a.length || !b.length) return [a, b];
  const start = Math.max(a[0][0], b[0][0]);
  return [a.filter((x) => x[0] >= start), b.filter((x) => x[0] >= start)];
}

export function normalize(bars: Bar[]): { time: string; value: number }[] {
  const base = bars[0]?.[4];
  if (!base) return [];
  return bars.map((x) => ({ time: toTime(x[0]), value: (x[4] / base) * 100 }));
}

export function shortHistoryNotice(bars: Bar[], tf: Timeframe): string | null {
  if (tf === 'd') return null;
  const n = resample(bars, tf).length;
  return n >= 3 ? null : `상장 후 ${bars.length}거래일 · ${TF_LABEL[tf]} ${n}개`;
}
