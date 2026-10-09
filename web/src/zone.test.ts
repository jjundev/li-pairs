import { describe, expect, it } from 'vitest';
import type { Bar } from './types';
import { align, COST, defaultStart, rolling, type Row, simulate, startIndex, summarize } from './zone';
import fixture from './zone.kospi200.json';

const bar = (d: number, c: number): Bar => [d, c, c, c, c, 0];
const rowsOf = (ps: number[], ls: number[], ss: number[]): Row[] =>
  ps.map((p, i) => ({ d: 20260101 + i, p, l: ls[i], s: ss[i] }));

describe('zone', () => {
  it('align 은 세 쪽 모두 있는 날만 남긴다', () => {
    const r = align([bar(1, 10), bar(2, 11), bar(3, 12)], [bar(1, 5), bar(3, 6)], [bar(1, 7), bar(2, 8), bar(3, 9)]);
    expect(r).toEqual([{ d: 1, p: 10, l: 5, s: 7 }, { d: 3, p: 12, l: 6, s: 9 }]);
  });

  it('startIndex: 휴장일이면 다음 거래일, 범위 밖·null 이면 10년 전 기본값', () => {
    const rows = [20100104, 20160105, 20160107, 20260105].map((d) => ({ d, p: 1, l: 1, s: 1 }));
    expect(defaultStart(rows)).toBe(1); // 20260105 − 100000 = 20160105
    expect(startIndex(rows, 20160106)).toBe(2);
    expect(startIndex(rows, 19990101)).toBe(1);
    expect(startIndex(rows, 20300101)).toBe(1);
    expect(startIndex(rows, null)).toBe(1);
  });

  it('횡보하면 zone 안에서 끝나고 손실, 한 방향이면 zone 밖에서 이익', () => {
    const zig = rowsOf([100, 110, 100, 110, 100], [1, 1.2, 0.98, 1.18, 0.96], [1, 0.8, 0.96, 0.77, 0.92]);
    const z = simulate(zig, 0, 0).at(-1)!;
    expect(z.out).toBe(false);
    expect(z.pnl).toBeLessThan(0);
    const up = rowsOf([100, 110, 121, 133.1], [1, 1.2, 1.44, 1.728], [1, 0.8, 0.64, 0.512]);
    const u = simulate(up, 0, 0).at(-1)!;
    expect(u.out).toBe(true);
    expect(u.pnl).toBeCloseTo(0.5 * 1.728 + 0.5 * 0.512 - 1, 10);
  });

  it('zone 띠는 진입일 폭 0, 이후 √Σℓ²', () => {
    const days = simulate(rowsOf([100, 110, 99], [1, 1, 1], [1, 1, 1]), 0, 0);
    expect(days[0]).toMatchObject({ lo: 100, hi: 100, out: false, pnl: 0 });
    const z = Math.sqrt(Math.log(1.1) ** 2 + Math.log(0.9) ** 2);
    expect(days[2].hi).toBeCloseTo(100 * Math.exp(z), 10);
    expect(days[2].lo).toBeCloseTo(100 * Math.exp(-z), 10);
  });

  it('델타 엑싯: 큰 쪽을 작은 쪽까지 팔아 현금, 비용 차감, zone 다시 시작', () => {
    const days = simulate(rowsOf([100, 110], [1, 1.2], [1, 0.8]), 0, 0.1); // L 0.6, S 0.4 → 갭 20% > 10%
    expect(days[1].reset).toBe(true);
    expect(days[1].pnl).toBeCloseTo(0.6 + 0.4 - 1 - 0.2 * COST, 12);
    expect(days[1]).toMatchObject({ lo: 110, hi: 110, out: false });
    expect(simulate(rowsOf([100, 110], [1, 1.2], [1, 0.8]), 0, 0)[1].reset).toBe(false);
  });

  it('rolling·summarize: 창 개수, H가 길면 0개, 빈 그룹은 NaN', () => {
    const rows = rowsOf(Array(300).fill(100), Array(300).fill(1), Array(300).fill(1));
    expect(rolling(rows, 0, 250)).toHaveLength(50);
    expect(rolling(rows, 0, 300)).toHaveLength(0);
    const s = summarize([]);
    expect(s.n).toBe(0);
    expect(Number.isNaN(s.escape) && Number.isNaN(s.out.mean) && Number.isNaN(s.all.win)).toBe(true);
  });

  it('실데이터 회귀: 코스피200 10년 (2016-10-06 진입, 1:1 보유)', () => {
    const rows = (fixture as number[][]).map(([d, p, l, s]) => ({ d, p, l, s }));
    const days = simulate(rows, 0, 0);
    const at = (d: number) => days.find((x) => x.d === d)!;
    expect(rows).toHaveLength(2452);
    expect(at(20241230).pnl).toBeCloseTo(-0.2463, 3);
    expect(at(20241230).out).toBe(false);
    expect(at(20261006).pnl).toBeCloseTo(3.9838, 3);
    expect(at(20261006).out).toBe(true);
    const s = summarize(rolling(rows, 0, 60));
    expect(s.n).toBe(2392); // 2,452행 − 60
    expect(s.escape).toBeCloseTo(0.3558, 3);
    expect(s.out.win).toBeCloseTo(0.9307, 3);
    expect(s.in.win).toBeCloseTo(0.0785, 3);
    expect(s.out.mean).toBeCloseTo(0.0541, 3);
    expect(s.in.mean).toBeCloseTo(-0.0191, 3);
  });
});
