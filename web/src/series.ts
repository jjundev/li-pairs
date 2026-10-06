import { resample, TF_LABEL } from './resample';
import type { Bar, Timeframe } from './types';

export function toTime(d: number): string {
  const s = String(d);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

export function commonStart(a: Bar[], b: Bar[]): [Bar[], Bar[]] {
  if (!a.length || !b.length) return [a, b];
  // 두 차트는 봉 순서로 동기화되므로 겹치는 구간은 양쪽에 다 있는 날만 남긴다.
  // 끝 꼬리(한쪽만 갱신 실패로 하루 늦은 경우)는 순서를 흐트러뜨리지 않으니 남긴다.
  const start = Math.max(a[0][0], b[0][0]);
  const end = Math.min(a[a.length - 1][0], b[b.length - 1][0]);
  const inA = new Set(a.map((x) => x[0]));
  const inB = new Set(b.map((x) => x[0]));
  const keep = (x: Bar) => x[0] >= start && (x[0] > end || (inA.has(x[0]) && inB.has(x[0])));
  return [a.filter(keep), b.filter(keep)];
}

// 가격 축 숫자: 겹쳐보기는 1천만~0.0001까지 벌어지므로 자릿수를 값 크기에 맞춘다.
export function fmtPrice(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) return Math.round(v).toLocaleString('en-US');
  if (a >= 1 || a === 0) return String(Number(v.toFixed(2)));
  if (a >= 1e-4) return String(Number(v.toPrecision(3)));
  const [m, e] = v.toExponential(2).split('e');
  const sup = e.replace('+', '').replace(/[-0-9]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
  return `${Number(m)}×10${sup}`;
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
