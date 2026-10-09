import { TIMEFRAMES } from './resample';
import type { Timeframe } from './types';

export type Hold = 20 | 60 | 120 | 250;
export type Gap = 0 | 5 | 10 | 20;
export const HOLDS: Hold[] = [20, 60, 120, 250];
export const GAPS: Gap[] = [0, 5, 10, 20];

export interface ZoneRoute { view: 'zone'; id: string; from: number | null; h: Hold; g: Gap }

export type Route =
  | { view: 'list' }
  | { view: 'pair'; id: string; long: string | null; short: string | null; tf: Timeframe }
  | ZoneRoute;

function parseZone(id: string, q: URLSearchParams): ZoneRoute {
  const from = q.get('from') ?? '';
  const h = Number(q.get('h'));
  const g = Number(q.get('g'));
  return {
    view: 'zone',
    id,
    from: /^\d{8}$/.test(from) ? Number(from) : null,
    h: HOLDS.includes(h as Hold) ? (h as Hold) : 60,
    g: GAPS.includes(g as Gap) ? (g as Gap) : 0,
  };
}

export function parseHash(hash: string): Route {
  const z = /^#\/z\/([^?]+)(?:\?(.*))?$/.exec(hash);
  if (z) return parseZone(decodeURIComponent(z[1]), new URLSearchParams(z[2] ?? ''));
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

export function zoneHash(r: { id: string; from: number | null; h: Hold; g: Gap }): string {
  const q = new URLSearchParams();
  if (r.from !== null) q.set('from', String(r.from));
  if (r.h !== 60) q.set('h', String(r.h));
  if (r.g !== 0) q.set('g', String(r.g));
  const s = q.toString();
  return `#/z/${encodeURIComponent(r.id)}${s ? `?${s}` : ''}`;
}
