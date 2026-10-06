import { describe, expect, it } from 'vitest';
import { filterPairs, isAsymmetric, multLabel, pairAvailable, pickLegs } from './pair';
import type { Leg, Pair } from './types';

const leg = (symbol: string, mult: number, available = true, name = symbol): Leg => ({
  symbol, name, mult, file: `ohlc/US_${symbol}.json`, available, stale: false, lastDate: 20261006,
});
const spacex: Pair = {
  id: 'us-spacex', market: 'US', underlying: 'SpaceX (SPCX)',
  longs: [leg('SPCH', 2), leg('SPCM', 2, true, 'Tradr 2X Long SpaceX Daily')],
  shorts: [leg('SSPC', -2)],
};
const hynix: Pair = {
  id: 'kr-skhynix', market: 'KR', underlying: 'SK하이닉스',
  longs: [leg('0193T0', 2)], shorts: [leg('0197X0', -1, false)],
};

describe('pair', () => {
  it('pickLegs 는 지정 다리를, 없으면 대표 다리를 고른다', () => {
    expect(pickLegs(spacex, 'SPCM', null).long.symbol).toBe('SPCM');
    expect(pickLegs(spacex, 'NOPE', 'NOPE')).toEqual({ long: spacex.longs[0], short: spacex.shorts[0] });
  });
  it('isAsymmetric', () => {
    expect(isAsymmetric(leg('A', 2), leg('B', -2))).toBe(false);
    expect(isAsymmetric(leg('A', 2), leg('B', -1))).toBe(true);
  });
  it('multLabel 은 U+2212 마이너스를 쓴다', () => {
    expect(multLabel(2)).toBe('+2x');
    expect(multLabel(-2)).toBe('−2x');
    expect(multLabel(1.5)).toBe('+1.5x');
  });
  it('filterPairs 는 기초자산·심볼·이름을 대소문자 없이 찾는다', () => {
    const all = [spacex, hynix];
    expect(filterPairs(all, '')).toEqual(all);
    expect(filterPairs(all, '하이닉스')).toEqual([hynix]);
    expect(filterPairs(all, 'sspc')).toEqual([spacex]);
    expect(filterPairs(all, 'tradr')).toEqual([spacex]);
    expect(filterPairs(all, '없는것')).toEqual([]);
  });
  it('pairAvailable 은 대표 다리 둘 다 있어야 true', () => {
    expect(pairAvailable(spacex)).toBe(true);
    expect(pairAvailable(hynix)).toBe(false);
  });
});
