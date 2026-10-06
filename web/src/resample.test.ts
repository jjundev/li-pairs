import { describe, expect, it } from 'vitest';
import { periodKey, resample } from './resample';
import type { Bar } from './types';

const b = (d: number, o: number, h: number, l: number, c: number, v = 1): Bar => [d, o, h, l, c, v];

describe('periodKey', () => {
  it('ISO 주는 월요일 날짜로 묶는다 (연말을 넘는 주 포함)', () => {
    expect(periodKey(20261006, 'w')).toBe(20261005); // 화 → 월
    expect(periodKey(20261011, 'w')).toBe(20261005); // 일 → 같은 주 월
    expect(periodKey(20270101, 'w')).toBe(20261228); // 금 → 전년도 월
  });
  it('월·분기·연', () => {
    expect(periodKey(20261006, 'm')).toBe(202610);
    expect(periodKey(20260331, 'q')).toBe(20261);
    expect(periodKey(20260401, 'q')).toBe(20262);
    expect(periodKey(20261231, 'q')).toBe(20264);
    expect(periodKey(20261231, 'y')).toBe(2026);
  });
});

describe('resample', () => {
  const days: Bar[] = [
    b(20260929, 10, 12, 9, 11, 100), // 화
    b(20260930, 11, 15, 10, 14, 200), // 수 (분기 마지막 날)
    b(20261001, 14, 14, 8, 9, 300), // 목 (다음 분기)
    b(20261005, 9, 10, 7, 8, 400), // 다음 주 월
  ];

  it('d 는 복사본을 돌려준다', () => {
    const out = resample(days, 'd');
    expect(out).toEqual(days);
    expect(out[0]).not.toBe(days[0]);
  });
  it('주봉: O=첫 시가, H=최고, L=최저, C=마지막 종가, V=합, 날짜=첫 거래일', () => {
    expect(resample(days, 'w')).toEqual([b(20260929, 10, 15, 8, 9, 600), b(20261005, 9, 10, 7, 8, 400)]);
  });
  it('분기봉은 분기 경계에서 나뉜다', () => {
    expect(resample(days, 'q')).toEqual([b(20260929, 10, 15, 9, 14, 300), b(20261001, 14, 14, 7, 8, 700)]);
  });
  it('연봉 하나로 묶이고 입력은 바뀌지 않는다', () => {
    const snapshot = JSON.stringify(days);
    expect(resample(days, 'y')).toEqual([b(20260929, 10, 15, 7, 8, 1000)]);
    expect(JSON.stringify(days)).toBe(snapshot);
  });
  it('빈 입력', () => {
    expect(resample([], 'm')).toEqual([]);
  });
});
