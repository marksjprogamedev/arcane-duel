// Toasts (`.ui-toast`, components.css), in one stack at the bottom of the page (`.ui-toast-stack`):
// - `showToast`: one short message that goes away by itself ("Display name saved"). A new message replaces
//   the one showing. It sits at the bottom of the stack.
// - `showActionToasts`: toasts with buttons that stay until the caller takes them away (an invite with
//   Join / Dismiss), newest on top, above the short message.

let stack: HTMLElement | null = null;
let actions: HTMLElement | null = null;
let bar: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let removeTimer: ReturnType<typeof setTimeout> | undefined;

function ensureStack() {
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'ui-toast-stack';
    actions = document.createElement('div');
    actions.className = 'ui-toast-stack__group';
    bar = document.createElement('div');
    bar.className = 'ui-toast';
    bar.setAttribute('role', 'status');
    bar.hidden = true;
    stack.append(actions, bar);
    document.body.append(stack);
  }
  return { actions: actions!, bar: bar! };
}

/** Shows `text` for `ms` milliseconds. Screen readers hear it (role="status"). */
export function showToast(text: string, ms = 2600) {
  const el = ensureStack().bar;
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

export interface ToastAction {
  label: string;
  /** A button colour from docs/UI.md: `is-green` to go, `is-beige` for harmless. */
  colour: 'is-green' | 'is-beige' | 'is-brown' | 'is-red';
  /** Read out instead of the label (`Join Merlin's lobby`). */
  ariaLabel?: string;
  onClick: () => void;
}

export interface ActionToast {
  /** Stays the same while the toast stays, so its element (and the keyboard on it) is kept. */
  key: string;
  text: string;
  actions: ToastAction[];
}

const drawn = new Map<string, HTMLElement>();

function actionToast(toast: ActionToast) {
  const el = document.createElement('div');
  el.className = 'ui-toast ui-toast--actions';
  el.setAttribute('role', 'status');
  const text = document.createElement('p');
  text.className = 'ui-toast__text';
  text.textContent = toast.text;
  const row = document.createElement('div');
  row.className = 'ui-toast__actions';
  for (const a of toast.actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `ui-btn ui-btn--secondary ${a.colour}`;
    b.textContent = a.label;
    if (a.ariaLabel) b.setAttribute('aria-label', a.ariaLabel);
    b.addEventListener('click', a.onClick);
    row.append(b);
  }
  el.append(text, row);
  return el;
}

/**
 * Shows exactly these toasts with buttons, first on top; ones no longer listed go. A toast already
 * showing (same key) is kept as it is, so a redraw does not move the keyboard off its buttons.
 */
export function showActionToasts(toasts: ActionToast[]) {
  const box = ensureStack().actions;
  const keep = new Set(toasts.map((t) => t.key));
  const hadFocus = box.contains(document.activeElement);
  for (const [key, el] of drawn)
    if (!keep.has(key)) {
      el.remove();
      drawn.delete(key);
    }
  const els = toasts.map((t) => {
    let el = drawn.get(t.key);
    if (!el) {
      el = actionToast(t);
      drawn.set(t.key, el);
    }
    return el;
  });
  // only moves what is out of order: moving the focused toast would drop the keyboard
  els.forEach((el, i) => {
    if (box.children[i] !== el) box.insertBefore(el, box.children[i] ?? null);
  });
  // the toast with the keyboard went (Join, Dismiss): on to the next one's first button, if any
  if (hadFocus && !box.contains(document.activeElement))
    box.querySelector<HTMLButtonElement>('button')?.focus();
}
