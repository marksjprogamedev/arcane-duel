// A row of icon choices you can scroll with the wheel or the side arrows (`.ui-carousel`, see docs/UI.md).
// It is a radio group underneath, so keyboard and screen readers work as for the plain chips.
export interface CarouselItem {
  value: number;
  /** Read out by screen readers and shown as the tooltip. */
  label: string;
  icon: HTMLElement;
}

export interface CarouselOptions {
  /** The radio group's name. */
  name: string;
  /** Names the whole group for screen readers. */
  label: string;
  items: CarouselItem[];
  selected: number;
  onPick: (value: number) => void;
  /** Tile size: `tall` for thin upright sprites such as staffs (default `normal`). */
  size?: 'normal' | 'tall' | 'large';
  /** An extra tile after the choices that does something instead of choosing (a "+" to add one). */
  add?: { label: string; disabled?: boolean; onClick: () => void };
}

/** How far one arrow click moves, as a share of the visible width. */
const STEP = 0.8;

/**
 * How far a wheel turn moves the row, or 0 to leave it to the page (nothing to scroll, or the row is
 * already at that end).
 */
export function wheelScrollAmount(
  event: { deltaX: number; deltaY: number },
  track: { scrollLeft: number; clientWidth: number; scrollWidth: number },
): number {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const atStart = track.scrollLeft <= 0 && delta < 0;
  const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth && delta > 0;
  return atStart || atEnd ? 0 : delta;
}

export function createCarousel(options: CarouselOptions): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ui-carousel' + (options.size ? ` ui-carousel--${options.size}` : '');
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-label', options.label);

  const track = document.createElement('div');
  track.className = 'ui-carousel__track';
  for (const item of options.items) {
    const label = document.createElement('label');
    label.className = 'ui-carousel__item';
    label.title = item.label;
    const input = document.createElement('input');
    input.type = 'radio';
    input.className = 'ui-carousel__input';
    input.name = options.name;
    input.value = String(item.value);
    input.checked = item.value === options.selected;
    input.setAttribute('aria-label', item.label);
    input.addEventListener('change', () => options.onPick(item.value));
    label.append(input, item.icon);
    track.appendChild(label);
  }

  if (options.add) {
    const { label, disabled, onClick } = options.add;
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'ui-carousel__item ui-carousel__add';
    add.title = label;
    add.setAttribute('aria-label', label);
    add.disabled = !!disabled;
    add.textContent = '+';
    add.addEventListener('click', onClick);
    track.appendChild(add);
  }

  const arrow = (dir: -1 | 1) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ui-btn ui-btn--icon is-beige ui-carousel__arrow';
    button.setAttribute('aria-label', dir < 0 ? 'Previous choices' : 'More choices');
    button.textContent = dir < 0 ? '◀' : '▶';
    button.addEventListener('click', () =>
      track.scrollBy({ left: dir * track.clientWidth * STEP, behavior: 'smooth' }),
    );
    return button;
  };
  const prev = arrow(-1);
  const next = arrow(1);

  const syncArrows = () => {
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
  };
  track.addEventListener('scroll', syncArrows, { passive: true });
  // the wheel moves along the row; at either end it goes back to scrolling the page
  track.addEventListener(
    'wheel',
    (event) => {
      const delta = wheelScrollAmount(event, track);
      if (delta === 0) return;
      event.preventDefault();
      track.scrollLeft += delta;
    },
    { passive: false },
  );

  // it is built while the Workshop is still hidden (no width yet): the first time it gets one, show the
  // chosen icon, and look at the arrows again whenever the width changes
  let shown = false;
  const layOut = () => {
    if (!shown && track.clientWidth > 0) {
      shown = true;
      const chosen = track.querySelector('input:checked')?.parentElement;
      if (chosen)
        track.scrollLeft = chosen.offsetLeft - (track.clientWidth - chosen.offsetWidth) / 2;
    }
    syncArrows();
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(layOut).observe(track);
  root.append(prev, track, next);
  syncArrows();
  return root;
}
