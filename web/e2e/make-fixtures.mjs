// 결정적 가짜 시세로 public/e2e-data/ 를 만든다 (실데이터와 섞이지 않도록 별도 폴더).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const out = new URL('../public/e2e-data/', import.meta.url);
rmSync(out, { recursive: true, force: true });
mkdirSync(new URL('ohlc/', out), { recursive: true });

const ymd = (d) => d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();

// 모든 종목이 2026-10-02(금)에 끝나도록 평일 n개를 거꾸로 센다.
function weekdaysEndingAt([y, m, d], n) {
  const out = [];
  let t = Date.UTC(y, m - 1, d);
  while (out.length < n) {
    const day = new Date(t);
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) out.unshift(ymd(day));
    t -= 86_400_000;
  }
  return out;
}

function series(n, p0, sign) {
  let p = p0;
  return weekdaysEndingAt([2026, 10, 2], n).map((d, i) => {
    const o = p;
    p = p * (1 + sign * 0.02 * Math.sin(i / 5));
    return [d, +o.toFixed(2), +(Math.max(o, p) * 1.01).toFixed(2), +(Math.min(o, p) * 0.99).toFixed(2), +p.toFixed(2), 1000 + i];
  });
}

// L1·L2: 600봉(2024-06-17~), S1: 400봉(2025-03-24~), NEWL·NEWS: 30봉(2026-08-24~)
const files = {
  KR_L1: ['KR', 'KRW', series(600, 10000, 1)],
  KR_L2: ['KR', 'KRW', series(600, 12000, 1)],
  KR_S1: ['KR', 'KRW', series(400, 8000, -1)],
  KR_S2: ['KR', 'KRW', series(250, 8000, -1)],
  KR_IDX_T: ['KR', 'KRW', series(600, 300, 1)],
  US_NEWL: ['US', 'USD', series(30, 20, 1)],
  US_NEWS: ['US', 'USD', series(30, 20, -1)],
};
for (const [name, [market, currency, bars]] of Object.entries(files)) {
  writeFileSync(new URL(`ohlc/${name}.json`, out), JSON.stringify({ symbol: name.split('_').at(-1), market, currency, bars }));
}

const leg = (market, symbol, mult, available = true) => ({
  symbol, name: `${symbol} 테스트 상품`, mult, file: `ohlc/${market}_${symbol}.json`,
  available, stale: false, lastDate: available ? files[`${market}_${symbol}`][2].at(-1)[0] : null,
});
writeFileSync(new URL('pairs.json', out), JSON.stringify({
  generatedAt: '2026-10-06T16:30+09:00',
  pairs: [
    { id: 'kr-test', market: 'KR', underlying: '테스트전자', longs: [leg('KR', 'L1', 2), leg('KR', 'L2', 2)], shorts: [leg('KR', 'S1', -2)],
      index: { symbol: 'T', name: '테스트지수', file: 'ohlc/KR_IDX_T.json', available: true, stale: false, lastDate: 20261002 } },
    { id: 'kr-short', market: 'KR', underlying: '짧은자산', longs: [leg('KR', 'L1', 2)], shorts: [leg('KR', 'S2', -2)],
      index: { symbol: 'T', name: '테스트지수', file: 'ohlc/KR_IDX_T.json', available: true, stale: false, lastDate: 20261002 } },
    { id: 'us-new', market: 'US', underlying: 'NEWCO', longs: [leg('US', 'NEWL', 2)], shorts: [leg('US', 'NEWS', -1)], index: null },
    { id: 'kr-missing', market: 'KR', underlying: '없는자산', longs: [leg('KR', 'MISS', 2, false)], shorts: [leg('KR', 'S1', -2)], index: null },
  ],
}));
