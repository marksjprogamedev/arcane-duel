/* Styled dropdown (`.ui-select`, see docs/UI.md). Wraps a native <select class="ui-field"> and keeps it as the
   source of truth: code keeps using `select.value`, `select.disabled`, its <option>s and its `change` event, and the
   styled button + list follow. The native select stays in the DOM, hidden. */

export type ListItem = { index: number; disabled: boolean };

/** The enabled item reached by stepping `step` (+1 / -1) from `from`, wrapping nothing: stays put at either end. */
export function stepEnabled(items: ListItem[], from: number, step: 1 | -1): number {
  for (let i = from + step; i >= 0 && i < items.length; i += step) {
    if (!items[i].disabled) return i;
  }
  return from;
}

const ENHANCED = 'uiSelectEnhanced';

/** Replaces the look of one <select>; safe to call twice. */
export function enhanceSelect(select: HTMLSelectElement): void {
  if (select.dataset[ENHANCED]) return;
  select.dataset[ENHANCED] = '1';

  const wrap = document.createElement('span');
  wrap.className = 'ui-select';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ui-select__button';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  const list = document.createElement('ul');
  list.className = 'ui-select__list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;

  select.before(wrap);
  wrap.append(select, button, list);
  select.classList.add('ui-select__native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  let rows: HTMLLIElement[] = [];
  let active = -1;

  const label = () => select.selectedOptions[0]?.textContent ?? '';
  const syncButton = () => {
    button.textContent = label();
    button.disabled = select.disabled;
    wrap.classList.toggle('is-disabled', select.disabled);
  };

  const build = () => {
    list.replaceChildren();
    rows = [];
    for (const child of Array.from(select.children)) {
      if (child instanceof HTMLOptGroupElement) {
        const heading = document.createElement('li');
        heading.className = 'ui-select__group';
        heading.textContent = child.label;
        list.append(heading);
        for (const option of Array.from(child.children)) addRow(option as HTMLOptionElement);
      } else addRow(child as HTMLOptionElement);
    }
  };
  const addRow = (option: HTMLOptionElement) => {
    const row = document.createElement('li');
    row.className = 'ui-select__option';
    row.setAttribute('role', 'option');
    row.textContent = option.textContent;
    row.dataset.index = String(option.index);
    row.setAttribute('aria-disabled', String(option.disabled));
    row.setAttribute('aria-selected', String(option.selected));
    row.onclick = () => {
      if (!option.disabled) choose(option.index);
    };
    row.onpointermove = () => {
      if (!option.disabled && active !== rows.indexOf(row)) highlight(rows.indexOf(row), false);
    };
    rows.push(row);
    list.append(row);
  };

  const items = (): ListItem[] =>
    rows.map((row) => ({
      index: Number(row.dataset.index),
      disabled: row.getAttribute('aria-disabled') === 'true',
    }));
  const highlight = (at: number, scroll = true) => {
    active = at;
    rows.forEach((row, i) => row.classList.toggle('is-active', i === at));
    if (scroll) rows[at]?.scrollIntoView({ block: 'nearest' });
  };

  const place = () => {
    const box = button.getBoundingClientRect();
    const room = window.innerHeight - box.bottom - 8;
    const above = room < 160 && box.top > room;
    list.style.left = `${box.left}px`;
    list.style.minWidth = `${box.width}px`;
    list.style.maxHeight = `${Math.max(120, Math.min(300, above ? box.top - 8 : room))}px`;
    list.style.top = above ? '' : `${box.bottom + 4}px`;
    list.style.bottom = above ? `${window.innerHeight - box.top + 4}px` : '';
  };
  const isOpen = () => !list.hidden;
  const open = () => {
    if (select.disabled || isOpen()) return;
    build();
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    place();
    highlight(Math.max(0, select.selectedIndex));
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', onScroll, true);
  };
  const close = () => {
    if (!isOpen()) return;
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    window.removeEventListener('resize', close);
    window.removeEventListener('scroll', onScroll, true);
  };
  // The list's own scrolling (wheel, drag, keyboard) must not close it; only the page moving away does.
  const onScroll = (ev: Event) => {
    if (ev.target instanceof Node && list.contains(ev.target)) return;
    close();
  };
  const outside = (ev: Event) => {
    if (!wrap.contains(ev.target as Node)) close();
  };
  const choose = (index: number) => {
    close();
    if (select.selectedIndex !== index) {
      select.selectedIndex = index;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    syncButton();
    button.focus();
  };

  button.onclick = () => (isOpen() ? close() : open());
  button.onkeydown = (ev) => {
    const key = ev.key;
    if (!isOpen()) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        ev.preventDefault();
        open();
      }
      return;
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      ev.preventDefault();
      highlight(stepEnabled(items(), active, key === 'ArrowDown' ? 1 : -1));
    } else if (key === 'Enter' || key === ' ') {
      ev.preventDefault();
      if (active >= 0) choose(items()[active].index);
    } else if (key === 'Escape' || key === 'Tab') {
      if (key === 'Escape') ev.stopPropagation();
      close();
    }
  };

  // Programmatic `select.value = x` fires no event, so wrap the setter to keep the button in step.
  const valueProp = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!;
  Object.defineProperty(select, 'value', {
    get: () => valueProp.get!.call(select),
    set: (v: string) => {
      valueProp.set!.call(select, v);
      syncButton();
    },
  });
  select.addEventListener('change', syncButton);
  new MutationObserver(() => {
    syncButton();
    if (!isOpen()) return;
    const top = list.scrollTop;
    const was = active;
    build();
    list.scrollTop = top;
    highlight(Math.min(was, rows.length - 1), false);
  }).observe(select, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled'],
  });
  syncButton();
}

/** Enhances every `select.ui-field` under `root`. */
export function enhanceSelects(root: ParentNode = document): void {
  root.querySelectorAll<HTMLSelectElement>('select.ui-field').forEach(enhanceSelect);
}
