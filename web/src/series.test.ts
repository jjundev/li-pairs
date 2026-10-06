import { describe, expect, it } from 'vitest';
import { commonStart, normalize, shortHistoryNotice, toTime } from './series';
import type { Bar } from './types';

const c = (d: number, close: number): Bar => [d, close, close, close, close, 0];

describe('series', () => {
  it('toTime', () => expect(toTime(20261006)).toBe('2026-10-06'));

  it('commonStart 는 늦게 상장한 쪽 첫날부터 둘 다 자른다', () => {
    const a = [c(20260101, 1), c(20260102, 2), c(20260105, 3)];
    const b = [c(20260102, 9), c(20260105, 8)];
    expect(commonStart(a, b)).toEqual([[c(20260102, 2), c(20260105, 3)], b]);
    expect(commonStart(b, a)).toEqual([b, [c(20260102, 2), c(20260105, 3)]]);
  });

  it('commonStart 는 가운데 빠진 날을 양쪽에서 빼서 날짜를 맞춘다 (끝 꼬리는 남긴다)', () => {
    const a = [c(20260101, 1), c(20260102, 2), c(20260105, 3), c(20260106, 4)];
    const b = [c(20260101, 9), c(20260105, 8)];
    expect(commonStart(a, b)).toEqual([[c(20260101, 1), c(20260105, 3), c(20260106, 4)], b]);
  });

  it('commonStart 는 한쪽이 비면 그대로 둔다', () => {
    const a = [c(20260101, 1)];
    expect(commonStart(a, [])).toEqual([a, []]);
  });

  it('normalize 는 첫 종가를 100으로 맞춘다', () => {
    expect(normalize([c(20260101, 50), c(20260102, 75)])).toEqual([
      { time: '2026-01-01', value: 100 },
      { time: '2026-01-02', value: 150 },
    ]);
    expect(normalize([])).toEqual([]);
  });

  it('상장 직후 연봉이면 안내 문구, 충분하면 null', () => {
    const young = Array.from({ length: 30 }, (_, i) => c(20260820 + i, 10));
    expect(shortHistoryNotice(young, 'y')).toBe('상장 후 30거래일 · 연봉 1개');
    expect(shortHistoryNotice(young, 'd')).toBeNull();
    const old = [c(20230102, 1), c(20240102, 1), c(20250102, 1)];
    expect(shortHistoryNotice(old, 'y')).toBeNull();
  });
});
