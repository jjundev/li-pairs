import { el } from './dom';
import { filterPairs, multLabel, pairAvailable, pickLegs } from './pair';
import { pairHash } from './route';
import type { Pair, PairsDoc } from './types';

export const fmtGenerated = (s: string): string => s.replace('T', ' ').slice(0, 16);

function pairItem(p: Pair): HTMLElement {
  const { long, short } = pickLegs(p, null, null);
  return el('li', {}, [
    el('a', {
      href: pairHash({ id: p.id, long: null, short: null, tf: 'd' }),
      class: pairAvailable(p) ? 'pair' : 'pair off',
      'data-testid': `pair-${p.id}`,
    }, [
      el('span', { class: 'mkt' }, [p.market]),
      el('span', { class: 'und' }, [p.underlying]),
      el('span', { class: 'legs' }, [`${long.symbol} ${multLabel(long.mult)} / ${short.symbol} ${multLabel(short.mult)}`]),
      el('span', { class: 'count' }, [`롱 ${p.longs.length} · 숏 ${p.shorts.length}`]),
    ]),
  ]);
}

export function renderList(root: HTMLElement, doc: PairsDoc, state: { query: string }): void {
  const input = el('input', { type: 'search', placeholder: '종목·기초자산 검색', value: state.query, class: 'search' }) as HTMLInputElement;
  const list = el('ul', { class: 'pairs' });
  const draw = () => {
    const found = filterPairs(doc.pairs, state.query);
    list.replaceChildren(...(found.length ? found.map(pairItem) : [el('li', { class: 'empty' }, ['검색 결과가 없습니다'])]));
  };
  input.addEventListener('input', () => {
    state.query = input.value;
    draw();
  });
  root.replaceChildren(
    el('header', { class: 'top' }, [el('h1', {}, ['롱숏 페어']), el('p', { class: 'sub' }, [`데이터 ${fmtGenerated(doc.generatedAt)}`])]),
    input,
    list,
  );
  draw();
}
