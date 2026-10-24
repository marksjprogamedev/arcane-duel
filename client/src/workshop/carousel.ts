// A row of icon choices you can scroll with the wheel or the side arrows (`.ui-carousel`, see docs/UI.md).
// It is a radio group underneath, so keyboard and screen readers work as for the plain chips.
import { ATLAS_HEIGHT, ATLAS_URL, ATLAS_WIDTH, spriteRect } from './parts';

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
}

/** How far one arrow click moves, as a share of the visible width. */
const STEP = 0.8;

/** Where an atlas sprite sits inside a box: the pixel size of the icon and the crop of the atlas behind it. */
export function atlasIconStyle(category: string, index: number, boxW: number, boxH: number) {
  const rect = spriteRect(category, index);
  if (!rect) return null;
  const [x, y, w, h] = rect;
  const scale = Math.min(boxW / w, boxH / h);
  return {
    width: Math.round(w * scale),
    height: Math.round(h * scale),
    backgroundSize: ATLAS_WIDTH * scale + 'px ' + ATLAS_HEIGHT * scale + 'px',
    backgroundPosition: -x * scale + 'px ' + -y * scale + 'px',
  };
}

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

/** The atlas sprite for one choice, cropped and scaled to fit a box of `boxW` x `boxH` pixels. */
export function atlasIcon(
  category: string,
  index: number,
  boxW: number,
  boxH: number,
): HTMLElement {
  const icon = document.createElement('span');
  icon.className = 'ui-carousel__icon';
  const look = atlasIconStyle(category, index, boxW, boxH);
  if (!look) return icon;
  icon.style.width = look.width + 'px';
  icon.style.height = look.height + 'px';
  icon.style.backgroundImage = 'url("' + ATLAS_URL + '")';
  icon.style.backgroundSize = look.backgroundSize;
  icon.style.backgroundPosition = look.backgroundPosition;
  return icon;
}

export function createCarousel(options: CarouselOptions): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ui-carousel';
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

  root.append(prev, track, next);
  // once it is in the page and has a width, show the chosen icon and set the arrows
  requestAnimationFrame(() => {
    track.querySelector('input:checked')?.parentElement?.scrollIntoView?.({
      block: 'nearest',
      inline: 'center',
    });
    syncArrows();
  });
  syncArrows();
  return root;
}
