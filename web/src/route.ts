import { TIMEFRAMES } from './resample';
import type { Timeframe } from './types';

export type Route =
  | { view: 'list' }
  | { view: 'pair'; id: string; long: string | null; short: string | null; tf: Timeframe };

export function parseHash(hash: string): Route {
  const m = /^#\/p\/([^?]+)(?:\?(.*))?$/.exec(hash);
  if (!m) return { view: 'list' };
  const q = new URLSearchParams(m[2] ?? '');
  const tf = q.get('tf') as Timeframe | null;
  return {
    view: 'pair',
    id: decodeURIComponent(m[1]),
    long: q.get('l'),
    short: q.get('s'),
    tf: tf && TIMEFRAMES.includes(tf) ? tf : 'd',
  };
}

export function pairHash(r: { id: string; long: string | null; short: string | null; tf: Timeframe }): string {
  const q = new URLSearchParams();
  if (r.long) q.set('l', r.long);
  if (r.short) q.set('s', r.short);
  if (r.tf !== 'd') q.set('tf', r.tf);
  const s = q.toString();
  return `#/p/${encodeURIComponent(r.id)}${s ? `?${s}` : ''}`;
}
