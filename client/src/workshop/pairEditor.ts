// Pair alignment editor (Developer tools): go through every hat for a head, or every head for a body,
// see which pairs are already aligned, edit one and save it for everyone (see publishShared in ./store).
import { $ } from '../dom';
import { AVAILABLE, SETS } from './parts';
import { beginPairEdit, endPairEdit, refreshEditor, refreshHooks } from './layoutEditor';
import {
  canPublishShared,
  clearPair,
  editingPair,
  hasSavedPair,
  hasSharedPair,
  pairAlignments,
  pairKey,
  picked,
  publishShared,
  saveCurrentPair,
  setPicked,
  type PairKind,
  type PublishResult,
} from './store';

let kind: PairKind | null = null;

/** hat–head: go through hats for one head. head–body: go through heads for one body. */
const anchorKey = (k: PairKind) => (k === 'hatHead' ? 'head' : 'body');
const otherKey = (k: PairKind) => (k === 'hatHead' ? 'hat' : 'head');
/** No hat to align when the wizard wears none. */
const others = (k: PairKind) => AVAILABLE[otherKey(k)].filter((i) => k !== 'hatHead' || i !== 0);
const keyFor = (k: PairKind, other: number) =>
  pairKey(k, { ...picked, [otherKey(k)]: other, [anchorKey(k)]: picked[anchorKey(k)] });

const message = (result: PublishResult) =>
  result === 'published'
    ? 'Saved for everyone.'
    : result === 'unchanged'
      ? 'Nothing changed.'
      : result === 'failed'
        ? 'Applied here, but publishing failed. Try again.'
        : 'Applied for this session only. Only Workshop editors can save for everyone.';

export function initPairEditor() {
  const status = $('ww-pair-status');
  const anchor = $<HTMLSelectElement>('ww-pair-anchor');
  const list = $('ww-pair-list');
  const buttons = {
    hatHead: $<HTMLButtonElement>('ww-pair-kind-hat'),
    headBody: $<HTMLButtonElement>('ww-pair-kind-body'),
    off: $<HTMLButtonElement>('ww-pair-kind-off'),
  };
  const controls = ['ww-pair-help', 'ww-pair-anchor-row', 'ww-pair-progress', 'ww-pair-list'];

  const currentOther = () => (kind ? picked[otherKey(kind)] : -1);
  const aligned = (k: PairKind) => others(k).filter((o) => hasSavedPair(k, keyFor(k, o)));

  /** Rebuilds the anchor list, the rows and the buttons from the current state. */
  function draw() {
    $('ww-pair-help').textContent =
      'Click a row, drag the piece on the wizard or use the sliders, then Save pair. Click the row again to undo your edit. ' +
      (canPublishShared
        ? 'Saved pairs are shared with every player.'
        : 'Only Workshop editors can save for everyone; your changes last for this session.');
    for (const k of ['hatHead', 'headBody'] as const) {
      buttons[k].classList.toggle('is-green', kind === k);
      buttons[k].setAttribute('aria-pressed', String(kind === k));
    }
    buttons.off.classList.toggle('is-green', kind === null);
    buttons.off.setAttribute('aria-pressed', String(kind === null));
    for (const id of controls) $(id).hidden = kind === null;
    // only the buttons that mean something for the current mode
    $('ww-pair-actions').hidden = kind === null;
    $('ww-single-actions').hidden = kind !== null;
    $('ww-edit-part-row').hidden = kind !== null;
    $('arcaneWizardWorkshop').dataset.devMode = kind === null ? 'single' : 'pairs';
    if (kind === null) {
      $('ww-pair-current').textContent = 'Editing single pieces.';
      return;
    }
    $('ww-pair-anchor-label').textContent = kind === 'hatHead' ? 'Head' : 'Body';
    if (anchor.dataset.kind !== kind) {
      anchor.dataset.kind = kind;
      anchor.replaceChildren(
        ...AVAILABLE[anchorKey(kind)].map((i) => {
          const option = document.createElement('option');
          option.value = String(i);
          option.textContent = SETS[anchorKey(kind!)][i];
          return option;
        }),
      );
    }
    anchor.value = String(picked[anchorKey(kind)]);
    const total = others(kind).length;
    $('ww-pair-progress').textContent =
      `${aligned(kind).length} of ${total} ${kind === 'hatHead' ? 'hats' : 'heads'} aligned for this ` +
      `${kind === 'hatHead' ? 'head' : 'body'}. All saved: ${Object.keys(pairAlignments.hatHead).length} hat–head, ` +
      `${Object.keys(pairAlignments.headBody).length} head–body.`;
    list.replaceChildren(
      ...others(kind).map((other) => {
        const key = keyFor(kind!, other);
        const saved = hasSavedPair(kind!, key);
        const item = document.createElement('li');
        item.className = 'ui-list__item';
        const dot = document.createElement('span');
        dot.className = `ui-dot${saved ? ' is-online' : ''}`;
        const name = document.createElement('span');
        name.className = 'ui-list__grow';
        name.textContent = SETS[otherKey(kind!)][other];
        const meta = document.createElement('span');
        meta.className = 'ui-list__meta';
        meta.textContent = !saved
          ? 'not aligned'
          : hasSharedPair(kind!, key)
            ? 'aligned'
            : 'unsaved';
        const pick = document.createElement('button');
        pick.type = 'button';
        pick.className = `ui-btn ui-btn--secondary${other === currentOther() ? ' is-green' : ''}`;
        pick.textContent = other === currentOther() ? 'Editing' : 'Edit';
        pick.addEventListener('click', () => select(other));
        item.append(dot, name, meta, pick);
        return item;
      }),
    );
    const names = SETS[otherKey(kind)][currentOther()];
    $('ww-pair-current').textContent = editingPair
      ? `Editing ${names} on ${SETS[anchorKey(kind)][picked[anchorKey(kind)]]}.`
      : 'Pick a row to start.';
    for (const id of ['ww-pair-save', 'ww-pair-save-next', 'ww-pair-clear'])
      $<HTMLButtonElement>(id).disabled = !editingPair;
  }

  /** Shows this combination in the preview and starts editing its pair. */
  function select(other: number) {
    if (!kind) return;
    setPicked({ ...picked, [otherKey(kind)]: other });
    // the Workshop redraws its preview, colours and pickers for the new choice
    window.dispatchEvent(new CustomEvent('arcane-wizard-workshop-imported'));
    beginPairEdit(kind);
    status.textContent = '';
  }

  function setKind(next: PairKind | null) {
    kind = next;
    status.textContent = '';
    if (next === null) endPairEdit();
    else {
      const first =
        others(next).find((o) => !hasSavedPair(next, keyFor(next, o))) ?? others(next)[0];
      select(first);
    }
    draw();
  }

  async function publish(then?: () => void) {
    if (!kind) return;
    const publishing = kind;
    status.textContent = 'Saving...';
    const result = await publishShared();
    status.textContent = message(result);
    // the shared copy was reloaded: pick the pair up again
    if (kind === publishing) beginPairEdit(publishing);
    then?.();
    draw();
  }

  $('ww-pair-kind-hat').addEventListener('click', () => setKind('hatHead'));
  $('ww-pair-kind-body').addEventListener('click', () => setKind('headBody'));
  $('ww-pair-kind-off').addEventListener('click', () => setKind(null));
  anchor.addEventListener('change', () => {
    if (!kind) return;
    setPicked({ ...picked, [anchorKey(kind)]: Number(anchor.value) });
    select(currentOther());
  });
  $('ww-pair-save').addEventListener('click', () => {
    if (!kind || !editingPair) return;
    saveCurrentPair();
    void publish();
  });
  $('ww-pair-save-next').addEventListener('click', () => {
    if (!kind || !editingPair) return;
    const current = kind;
    saveCurrentPair();
    void publish(() => {
      const all = others(current);
      const from = all.indexOf(currentOther());
      const ordered = [...all.slice(from + 1), ...all.slice(0, from)];
      const next = ordered.find((o) => !hasSavedPair(current, keyFor(current, o)));
      if (next === undefined) status.textContent += ' Every pair for this one is aligned.';
      else select(next);
    });
  });
  $('ww-pair-clear').addEventListener('click', () => {
    if (!kind || !editingPair) return;
    clearPair(kind, keyFor(kind, currentOther()));
    void publish();
  });
  refreshHooks.push(draw);
  draw();
  refreshEditor();
}
