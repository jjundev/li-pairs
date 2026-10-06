import './style.css';
import { loadPairs } from './data';
import { renderDetail } from './detail';
import { el } from './dom';
import { renderList } from './list';
import { parseHash } from './route';
import type { PairsDoc } from './types';

const root = document.getElementById('app')!;
const listState = { query: '' };
let token = 0;
let cleanup: (() => void) | null = null;

async function render(): Promise<void> {
  const my = ++token;
  cleanup?.();
  cleanup = null;
  let doc: PairsDoc;
  try {
    doc = await loadPairs();
  } catch {
    if (my === token) root.replaceChildren(el('p', { class: 'error' }, ['데이터를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.']));
    return;
  }
  if (my !== token) return;
  const route = parseHash(location.hash);
  const pair = route.view === 'pair' ? doc.pairs.find((p) => p.id === route.id) : undefined;
  if (route.view === 'pair' && pair) {
    const done = await renderDetail(root, pair, route, doc.generatedAt, () => my !== token);
    if (my === token) cleanup = done;
    else done();
    return;
  }
  renderList(root, doc, listState);
}

window.addEventListener('hashchange', render);
render();
