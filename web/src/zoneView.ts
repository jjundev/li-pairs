// Zone 화면: 지수 위 손익분기 zone, 실제 1:1 페어 손익, 모든 진입일의 H일 보유 통계.
import {
  BaselineSeries, createSeriesMarkers, HistogramSeries, LineSeries, LineStyle, type IChartApi, type MouseEventParams, type Time,
} from 'lightweight-charts';
import { baseChart, DOWN, UP } from './chart';
import { loadOhlc } from './data';
import { el } from './dom';
import { fmtGenerated } from './list';
import { pickLegs } from './pair';
import { GAPS, HOLDS, zoneHash, type ZoneRoute } from './route';
import { fmtPrice, toTime } from './series';
import type { Bar, Pair, PairsDoc } from './types';
import { align, defaultStart, MIN_ROWS, rolling, simulate, startIndex, summarize, type Group } from './zone';

const GRAY = '#9ca3af';
const PRE = 'rgba(156, 163, 175, 0.35)';

async function barsOf(file: string, available: boolean): Promise<Bar[]> {
  if (!available) return [];
  try {
    return (await loadOhlc(file)).bars;
  } catch {
    return [];
  }
}

const minus = (s: string) => s.replace('-', '−');
const pct = (v: number, digits = 1, sign = true): string =>
  Number.isNaN(v) ? '—' : minus(`${sign && v > 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`);
const pctAxis = (v: number) => minus(`${fmtPrice(v)}%`);

function timeToYmd(t: Time | undefined): number | null {
  if (t === undefined) return null;
  if (typeof t === 'string') return Number(t.replaceAll('-', ''));
  if (typeof t === 'number') {
    const d = new Date(t * 1000);
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  }
  return t.year * 10000 + t.month * 100 + t.day;
}

function stat(testid: string, title: string, g: Group | null, value?: string): HTMLElement {
  const main = value ?? (g ? `${pct(g.mean)}` : '—');
  const sub = g ? (g.n ? `승률 ${pct(g.win, 0, false)} · ${g.n.toLocaleString('en-US')}회` : '—') : '';
  return el('div', { class: 'stat', 'data-testid': testid }, [
    el('span', { class: 'stat-t' }, [title]),
    el('strong', {}, [main]),
    el('span', { class: 'stat-s' }, [sub]),
  ]);
}

function box(testid: string, n: number): HTMLElement {
  return el('div', { class: 'chart zone', 'data-testid': testid, 'data-bars': String(n) });
}

export async function renderZone(
  root: HTMLElement, doc: PairsDoc, pair: Pair, route: ZoneRoute, cancelled: () => boolean,
): Promise<() => void> {
  const go = (patch: Partial<ZoneRoute>) => location.replace(zoneHash({ ...route, ...patch }));
  const indexed = doc.pairs.filter((p) => p.index);
  const picker = el('select', { 'data-testid': 'zone-pair' }, indexed.map((p) => {
    const o = el('option', { value: p.id }, [p.underlying]) as HTMLOptionElement;
    o.selected = p.id === pair.id;
    return o;
  })) as HTMLSelectElement;
  // 지수 없는 페어를 주소로 연 경우: 아무것도 고르지 않은 상태로 둬야 첫 항목을 골라도 change 가 난다.
  if (!indexed.some((p) => p.id === pair.id)) picker.selectedIndex = -1;
  picker.addEventListener('change', () => location.replace(zoneHash({ id: picker.value, from: null, h: route.h, g: route.g })));
  const head = [
    el('a', { href: '#/', class: 'back' }, ['← 목록']),
    el('div', { class: 'title' }, [el('h1', {}, [`${pair.underlying} Zone`]), el('span', { class: 'badge' }, [pair.market])]),
    ...(indexed.length > 1 ? [el('div', { class: 'pickers' }, [picker])] : []),
  ];
  const notice = (text: string) => {
    root.replaceChildren(...head, el('p', { class: 'notice' }, [text]));
    return () => {};
  };

  const idx = pair.index;
  if (!idx || !idx.available) return notice('이 페어는 지수 데이터가 없어 zone을 계산할 수 없습니다');
  const { long, short } = pickLegs(pair, null, null);
  root.replaceChildren(...head, el('p', { class: 'loading' }, ['불러오는 중…']));
  const [ib, lb, sb] = await Promise.all([barsOf(idx.file, true), barsOf(long.file, long.available), barsOf(short.file, short.available)]);
  if (cancelled()) return () => {};
  if (!ib.length) return notice('이 페어는 지수 데이터가 없어 zone을 계산할 수 없습니다');
  const rows = align(ib, lb, sb);
  if (rows.length < MIN_ROWS) return notice('데이터가 1년이 안 돼 zone을 계산할 수 없습니다');

  const start = startIndex(rows, route.from);
  const days = simulate(rows, start, route.g / 100);
  const wins = rolling(rows, defaultStart(rows), route.h); // 통계는 진입일과 무관하게 10년 전체
  const sum = summarize(wins);
  const last = days[days.length - 1];
  const resets = days.filter((d) => d.reset).length;

  const holdBtns = HOLDS.map((h) => {
    const b = el('button', { type: 'button', 'data-testid': `h-${h}`, 'aria-pressed': String(h === route.h) }, [String(h)]);
    b.addEventListener('click', () => go({ h }));
    return b;
  });
  const gapBtns = GAPS.map((g) => {
    const b = el('button', { type: 'button', 'data-testid': `g-${g}`, 'aria-pressed': String(g === route.g) }, [g ? `${g}%` : '없음']);
    b.addEventListener('click', () => go({ g }));
    return b;
  });

  root.replaceChildren(
    ...head,
    el('p', { class: 'status' }, [
      `지수 ${idx.name} · 롱 ${long.symbol} · 숏 ${short.symbol} · 진입 ${toTime(rows[start].d)} · 생성 ${fmtGenerated(doc.generatedAt)}`,
      ...(idx.stale ? [el('span', { class: 'stale' }, [' (지수 갱신 실패)'])] : []),
    ]),
    el('p', { class: 'zone-now' }, [
      `${toTime(last.d)} 페어 손익 `,
      el('strong', { class: last.pnl >= 0 ? 'up' : 'down' }, [pct(last.pnl)]),
      ` · 지수 ${last.out ? 'zone 밖' : 'zone 안'}`,
      ...(route.g ? [` · 델타 엑싯 ${resets}회`] : []),
    ]),
    el('h2', {}, ['지수와 zone']),
    el('p', { class: 'hint' }, ['빨강 = zone 밖(페어 이익 구간) · 점선 = zone · 차트를 누르면 그날 진입']),
    box('zone-index', days.length),
    el('h2', {}, [route.g ? `1:1 페어 손익 (갭 ${route.g}% 델타 엑싯)` : '1:1 페어 손익 (계속 보유)']),
    ...(route.g ? [el('p', { class: 'hint' }, ['엑싯한 금액은 현금으로 두고 다시 사지 않습니다 · 매매비용 0.03%'])] : []),
    box('zone-pnl', days.length),
    el('h2', {}, [`${route.h}일 보유 기준 · 모든 진입일${route.g ? ' (엑싯 없이 보유)' : ''}`]),
    el('p', { class: 'hint' }, ['막대 = 그날 사서 ' + route.h + '일 뒤 손익 · 빨강 탈출 · 회색 갇힘']),
    box('zone-rolling', wins.length),
    el('div', { class: 'stats' }, [
      stat('stat-escape', '탈출 비율', null, pct(sum.escape, 1, false)),
      stat('stat-out', '탈출 시 평균', sum.out),
      stat('stat-in', '갇힘 시 평균', sum.in),
      stat('stat-all', '전체 평균', sum.all),
    ]),
    el('p', { class: 'notice' }, [
      `zone 탈출 여부는 미리 알 수 없습니다 · 탈출 비율 ${Number.isNaN(sum.escape) ? '—' : `${Math.round(sum.escape * 100)}%`} · 세전`,
    ]),
    el('div', { class: 'zbar-space' }),
    el('nav', { class: 'tfbar zbar' }, [
      el('div', {}, [el('span', { class: 'zl' }, ['보유']), ...holdBtns]),
      el('div', {}, [el('span', { class: 'zl' }, ['엑싯']), ...gapBtns]),
    ]),
  );

  const made: IChartApi[] = [];
  const observers: ResizeObserver[] = [];
  const host = (id: string) => root.querySelector<HTMLElement>(`[data-testid=${id}]`)!;
  // 10년(약 2,500봉)을 휴대폰 폭 한 화면에 다 넣는다. 처음 그릴 때는 폭이 아직 0일 수 있어
  // 폭이 바뀔 때마다 다시 맞춘다.
  const chartOf = (id: string, log: boolean, priceFormatter = fmtPrice) => {
    const h = host(id);
    const c = baseChart(h, log);
    c.applyOptions({ timeScale: { minBarSpacing: 0.01 }, handleScroll: { vertTouchDrag: false }, localization: { priceFormatter } });
    let width = 0;
    const ro = new ResizeObserver(() => {
      if (h.clientWidth === width) return;
      width = h.clientWidth;
      requestAnimationFrame(() => c.timeScale().fitContent());
    });
    ro.observe(h);
    observers.push(ro);
    made.push(c);
    return c;
  };

  const ic = chartOf('zone-index', true);
  ic.addSeries(LineSeries, { color: GRAY, lineWidth: 2, priceLineVisible: false, lastValueVisible: true }).setData([
    ...rows.slice(0, start).map((r) => ({ time: toTime(r.d), value: r.p, color: PRE })),
    ...days.map((d) => ({ time: toTime(d.d), value: d.p, color: d.out ? UP : GRAY })),
  ]);
  const band = { color: GRAY, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false } as const;
  const hi = ic.addSeries(LineSeries, band);
  hi.setData(days.map((d) => ({ time: toTime(d.d), value: d.hi })));
  ic.addSeries(LineSeries, band).setData(days.map((d) => ({ time: toTime(d.d), value: d.lo })));
  createSeriesMarkers(hi, [
    { time: toTime(days[0].d), position: 'aboveBar', color: GRAY, shape: 'arrowDown', text: '진입' },
    // 엑싯이 너무 잦으면 표시가 차트를 덮으므로 생략한다 (횟수는 위 요약 줄에 있다).
    ...(resets <= 60 ? days.filter((d) => d.reset) : []).map((d) => ({ time: toTime(d.d), position: 'aboveBar' as const, color: DOWN, shape: 'circle' as const, size: 0.5 })),
  ]);
  ic.subscribeClick((p: MouseEventParams) => {
    const d = timeToYmd(p.time);
    if (d && d !== rows[start].d) go({ from: d });
  });
  ic.timeScale().fitContent();

  const pc = chartOf('zone-pnl', false, pctAxis);
  pc.addSeries(BaselineSeries, {
    baseValue: { type: 'price', price: 0 },
    topLineColor: UP, topFillColor1: 'rgba(229, 72, 77, 0.25)', topFillColor2: 'rgba(229, 72, 77, 0.02)',
    bottomLineColor: DOWN, bottomFillColor1: 'rgba(59, 130, 246, 0.02)', bottomFillColor2: 'rgba(59, 130, 246, 0.25)',
  }).setData(days.map((d) => ({ time: toTime(d.d), value: d.pnl * 100 })));
  pc.timeScale().fitContent();

  if (wins.length) {
    const rc = chartOf('zone-rolling', false, pctAxis);
    rc.addSeries(HistogramSeries, { priceLineVisible: false })
      .setData(wins.map((w) => ({ time: toTime(w.d), value: w.pnl * 100, color: w.out ? UP : GRAY })));
    rc.timeScale().fitContent();
  } else {
    host('zone-rolling').append(el('div', { class: 'nodata' }, [`진입 후 ${route.h}거래일이 지나지 않았습니다`]));
  }
  return () => {
    observers.forEach((o) => o.disconnect());
    made.forEach((c) => c.remove());
  };
}
