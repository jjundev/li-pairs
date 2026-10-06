import { CandlestickSeries, createChart, LineSeries, PriceScaleMode, type IChartApi } from 'lightweight-charts';
import { normalize, toTime } from './series';
import type { Bar } from './types';

const UP = '#e5484d';
const DOWN = '#3b82f6';

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888';
}

function baseChart(host: HTMLElement, log: boolean): IChartApi {
  return createChart(host, {
    autoSize: true,
    layout: { background: { color: 'transparent' }, textColor: cssVar('--muted'), fontSize: 11 },
    grid: { vertLines: { visible: false }, horzLines: { color: cssVar('--grid') } },
    rightPriceScale: { mode: log ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal, borderVisible: false },
    timeScale: { borderVisible: false },
  });
}

function focusRecent(chart: IChartApi, n: number): void {
  if (n > 150) chart.timeScale().setVisibleLogicalRange({ from: n - 120, to: n + 2 });
  else chart.timeScale().fitContent();
}

export function candleChart(host: HTMLElement, bars: Bar[], log: boolean): IChartApi {
  const chart = baseChart(host, log);
  chart
    .addSeries(CandlestickSeries, { upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false })
    .setData(bars.map((b) => ({ time: toTime(b[0]), open: b[1], high: b[2], low: b[3], close: b[4] })));
  focusRecent(chart, bars.length);
  return chart;
}

export function overlayChart(host: HTMLElement, a: Bar[], b: Bar[], log: boolean): IChartApi {
  const chart = baseChart(host, log);
  chart.addSeries(LineSeries, { color: UP, lineWidth: 2 }).setData(normalize(a));
  chart.addSeries(LineSeries, { color: DOWN, lineWidth: 2 }).setData(normalize(b));
  focusRecent(chart, a.length);
  return chart;
}

export function syncTimeScales(a: IChartApi, b: IChartApi): void {
  let busy = false;
  const link = (src: IChartApi, dst: IChartApi) =>
    src.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (busy || !range) return;
      busy = true;
      dst.timeScale().setVisibleLogicalRange(range);
      busy = false;
    });
  link(a, b);
  link(b, a);
}
