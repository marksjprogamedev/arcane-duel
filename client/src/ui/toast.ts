// Toast (`.ui-toast`, components.css): one short message at the bottom of the page that goes away by
// itself ("Display name saved"). A new message replaces the one showing.

let bar: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let removeTimer: ReturnType<typeof setTimeout> | undefined;

/** Shows `text` for `ms` milliseconds. Screen readers hear it (role="status"). */
export function showToast(text: string, ms = 2600) {
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'ui-toast';
    bar.setAttribute('role', 'status');
    document.body.append(bar);
  }
  const el = bar;
  clearTimeout(hideTimer);
  clearTimeout(removeTimer);
  el.textContent = text;
  el.hidden = false;
  el.classList.remove('is-leaving');
  hideTimer = setTimeout(() => {
    el.classList.add('is-leaving');
    removeTimer = setTimeout(() => (el.hidden = true), 300);
  }, ms);
}
