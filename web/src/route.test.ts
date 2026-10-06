import { describe, expect, it } from 'vitest';
import { pairHash, parseHash } from './route';

describe('route', () => {
  it('빈 해시와 모르는 해시는 목록', () => {
    expect(parseHash('')).toEqual({ view: 'list' });
    expect(parseHash('#/')).toEqual({ view: 'list' });
    expect(parseHash('#/zzz')).toEqual({ view: 'list' });
  });
  it('페어 해시를 읽는다', () => {
    expect(parseHash('#/p/us-spacex?l=SPCM&s=SSPC&tf=q')).toEqual({
      view: 'pair', id: 'us-spacex', long: 'SPCM', short: 'SSPC', tf: 'q',
    });
  });
  it('잘못된 tf 는 d', () => {
    expect(parseHash('#/p/kr-skhynix?tf=h')).toEqual({ view: 'pair', id: 'kr-skhynix', long: null, short: null, tf: 'd' });
  });
  it('pairHash 는 parseHash 와 왕복하고 d 는 생략한다', () => {
    expect(pairHash({ id: 'kr-skhynix', long: null, short: null, tf: 'd' })).toBe('#/p/kr-skhynix');
    const r = { view: 'pair' as const, id: 'us-semis', long: 'SOXL', short: 'SOXS', tf: 'y' as const };
    expect(parseHash(pairHash(r))).toEqual(r);
  });
});
