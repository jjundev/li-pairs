import type { Bar, Timeframe } from './types';

export const TIMEFRAMES: Timeframe[] = ['d', 'w', 'm', 'q', 'y'];
export const TF_LABEL: Record<Timeframe, string> = { d: '일봉', w: '주봉', m: '월봉', q: '분기봉', y: '연봉' };

const DAY_MS = 86_400_000;

export function periodKey(d: number, tf: Timeframe): number {
  const y = Math.floor(d / 10000);
  const m = Math.floor(d / 100) % 100;
  switch (tf) {
    case 'd':
      return d;
    case 'm':
      return y * 100 + m;
    case 'q':
      return y * 10 + Math.ceil(m / 3);
    case 'y':
      return y;
    case 'w': {
      const t = Date.UTC(y, m - 1, d % 100);
      const sinceMonday = (new Date(t).getUTCDay() + 6) % 7;
      const mon = new Date(t - sinceMonday * DAY_MS);
      return mon.getUTCFullYear() * 10000 + (mon.getUTCMonth() + 1) * 100 + mon.getUTCDate();
    }
  }
}

export function resample(bars: Bar[], tf: Timeframe): Bar[] {
  const out: Bar[] = [];
  let key: number | null = null;
  for (const bar of bars) {
    const k = periodKey(bar[0], tf);
    const last = out[out.length - 1];
    if (tf === 'd' || k !== key || !last) {
      out.push([...bar]);
      key = k;
    } else {
      last[2] = Math.max(last[2], bar[2]);
      last[3] = Math.min(last[3], bar[3]);
      last[4] = bar[4];
      last[5] += bar[5];
    }
  }
  return out;
}
