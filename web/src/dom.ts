export function el(tag: string, attrs: Record<string, string> = {}, children: (Node | string)[] = []): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'value') (e as HTMLInputElement).value = v;
    else e.setAttribute(k, v);
  }
  e.append(...children);
  return e;
}
