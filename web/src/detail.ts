import type { IChartApi } from 'lightweight-charts';
import { candleChart, overlayChart, syncTimeScales } from './chart';
import { loadOhlc } from './data';
import { el } from './dom';
import { fmtGenerated } from './list';
import { isAsymmetric, multLabel, pickLegs } from './pair';
import { TF_LABEL, TIMEFRAMES, resample } from './resample';
import { pairHash, type Route } from './route';
import { commonStart, shortHistoryNotice, toTime } from './series';
import type { Bar, Leg, Pair } from './types';

type PairRoute = Extract<Route, { view: 'pair' }>;

const mode = { log: true, overlay: false };

async function barsOf(leg: Leg): Promise<Bar[]> {
  if (!leg.available) return [];
  try {
    return (await loadOhlc(leg.file)).bars;
  } catch {
    return [];
  }
}

function legPicker(testid: string, legs: Leg[], current: Leg, onPick: (symbol: string) => void): HTMLElement | null {
  if (legs.length < 2) return null;
  const sel = el('select', { 'data-testid': testid }, legs.map((l) => {
    const o = el('option', { value: l.symbol }, [`${l.symbol} ${multLabel(l.mult)}`]) as HTMLOptionElement;
    o.selected = l.symbol === current.symbol;
    return o;
  })) as HTMLSelectElement;
  sel.addEventListener('change', () => onPick(sel.value));
  return sel;
}

function legStatus(leg: Leg): HTMLElement {
  const date = leg.lastDate ? toTime(leg.lastDate) : '없음';
  return el('span', {}, [
    `${leg.symbol} ~${date}`,
    ...(leg.stale ? [el('span', { class: 'stale' }, [' (갱신 실패)'])] : []),
  ]);
}

function chartBox(testid: string, bars: Bar[], big = false): HTMLElement {
  const box = el('div', { class: big ? 'chart big' : 'chart', 'data-testid': testid, 'data-bars': String(bars.length) });
  if (!bars.length) box.append(el('div', { class: 'nodata' }, ['데이터 없음']));
  return box;
}

export async function renderDetail(
  root: HTMLElement, pair: Pair, route: PairRoute, generatedAt: string, cancelled: () => boolean,
): Promise<() => void> {
  const { long, short } = pickLegs(pair, route.long, route.short);
  root.replaceChildren(el('p', { class: 'loading' }, ['불러오는 중…']));
  const [rawLong, rawShort] = await Promise.all([barsOf(long), barsOf(short)]);
  if (cancelled()) return () => {};

  const [alignedLong, alignedShort] = commonStart(rawLong, rawShort);
  const lb = resample(alignedLong, route.tf);
  const sb = resample(alignedShort, route.tf);
  const go = (patch: Partial<PairRoute>) =>
    location.replace(pairHash({ id: pair.id, long: long.symbol, short: short.symbol, tf: route.tf, ...patch }));
  const rerender = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

  const pickers = [
    legPicker('sel-long', pair.longs, long, (s) => go({ long: s })),
    legPicker('sel-short', pair.shorts, short, (s) => go({ short: s })),
  ].filter((x): x is HTMLElement => x !== null);
  const notice = shortHistoryNotice(alignedLong.length <= alignedShort.length ? alignedLong : alignedShort, route.tf);

  const charts = mode.overlay
    ? [chartBox('chart-overlay', lb, true)]
    : [
        el('div', { class: 'leg-label' }, [el('span', {}, [`롱 ${long.symbol} ${multLabel(long.mult)}`]), el('span', {}, [long.name])]),
        chartBox('chart-long', lb),
        el('div', { class: 'leg-label' }, [el('span', {}, [`숏 ${short.symbol} ${multLabel(short.mult)}`]), el('span', {}, [short.name])]),
        chartBox('chart-short', sb),
      ];

  const tfButtons = TIMEFRAMES.map((tf) => {
    const b = el('button', { type: 'button', 'data-testid': `tf-${tf}`, 'aria-pressed': String(tf === route.tf), 'aria-label': TF_LABEL[tf] }, [tf]);
    b.addEventListener('click', () => go({ tf }));
    return b;
  });
  const toggle = (testid: string, label: string, key: 'log' | 'overlay') => {
    const b = el('button', { type: 'button', 'data-testid': testid, 'aria-pressed': String(mode[key]) }, [label]);
    b.addEventListener('click', () => {
      mode[key] = !mode[key];
      rerender();
    });
    return b;
  };

  root.replaceChildren(
    el('a', { href: '#/', class: 'back' }, ['← 목록']),
    el('div', { class: 'title' }, [
      el('h1', {}, [pair.underlying]),
      el('span', { class: 'badge' }, [pair.market]),
      ...(isAsymmetric(long, short) ? [el('span', { class: 'badge asym' }, ['비대칭'])] : []),
    ]),
    ...(pickers.length ? [el('div', { class: 'pickers' }, pickers)] : []),
    el('p', { class: 'status' }, [legStatus(long), ' · ', legStatus(short), ` · 생성 ${fmtGenerated(generatedAt)}`]),
    ...(notice ? [el('p', { class: 'notice' }, [notice])] : []),
    ...charts,
    el('nav', { class: 'tfbar' }, [...tfButtons, el('span', { class: 'sep' }), toggle('toggle-log', '로그', 'log'), toggle('toggle-overlay', '겹쳐보기', 'overlay')]),
  );

  const made: IChartApi[] = [];
  if (mode.overlay) {
    if (lb.length && sb.length) made.push(overlayChart(root.querySelector<HTMLElement>('[data-testid=chart-overlay]')!, lb, sb, mode.log));
  } else {
    if (lb.length) made.push(candleChart(root.querySelector<HTMLElement>('[data-testid=chart-long]')!, lb, mode.log));
    if (sb.length) made.push(candleChart(root.querySelector<HTMLElement>('[data-testid=chart-short]')!, sb, mode.log));
    if (made.length === 2) syncTimeScales(made[0], made[1]);
  }
  return () => made.forEach((c) => c.remove());
}
