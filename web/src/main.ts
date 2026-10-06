import './style.css';
import { loadPairs } from './data';
import { el } from './dom';
import { renderList } from './list';
import type { PairsDoc } from './types';

const root = document.getElementById('app')!;
const listState = { query: '' };
let token = 0;

async function render(): Promise<void> {
  const my = ++token;
  let doc: PairsDoc;
  try {
    doc = await loadPairs();
  } catch {
    if (my === token) root.replaceChildren(el('p', { class: 'error' }, ['데이터를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.']));
    return;
  }
  if (my !== token) return;
  renderList(root, doc, listState);
}

window.addEventListener('hashchange', render);
render();
