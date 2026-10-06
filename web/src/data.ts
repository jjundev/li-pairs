import type { OhlcFile, PairsDoc } from './types';

const BASE = import.meta.env.VITE_DATA_BASE ?? './data/';
const cache = new Map<string, Promise<unknown>>();

function getJson<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = fetch(BASE + path, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return r.json() as Promise<T>;
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return p;
}

export const loadPairs = (): Promise<PairsDoc> => getJson<PairsDoc>('pairs.json');
export const loadOhlc = (file: string): Promise<OhlcFile> => getJson<OhlcFile>(file);
