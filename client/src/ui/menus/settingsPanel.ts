import { $ } from '../../dom';
import {
  isPreviewing,
  loadTrack,
  onPreviewChange,
  startPreview,
  stopPreview,
  unlockMusic,
} from '../../audio/musicPlayer';
import { previewTrack } from '../../audio/trackChoice';
import { TRACKS, type MusicKind } from '../../audio/tracks';
import { createConfirm } from './confirmClick';
import { onSettings, updateSettings, type Settings } from '../../settings';

const panel = () => $('settings');

/** True while the settings page is showing, from the menu or over a match. */
export const settingsShowing = () => panel().style.display === 'flex';

let afterClose: (() => void) | null = null;
let leaveAction: (() => void) | null = null;

const LEAVE_LABEL = 'Leave match';
const leaveConfirm = createConfirm({
  onArm: () => ($('leaveMatch').textContent = 'Click again to leave'),
  onDisarm: () => ($('leaveMatch').textContent = LEAVE_LABEL),
  onConfirm: () => {
    const leave = leaveAction;
    hideSettings();
    leave?.();
  },
});

/**
 * Shows the settings page. `live` is set over a match: 'online' leaves the match running (a lighter dim and a
 * reminder), 'solo' sits over the pause screen. `onClose` runs once when the page goes away;
 * `onLeave` (over a match) shows the red Leave match button, which asks twice before calling it.
 */
export function showSettings(
  opts: { live?: 'online' | 'solo'; onClose?: () => void; onLeave?: () => void } = {},
) {
  const el = panel();
  el.classList.toggle('ui-screen--live', opts.live === 'online');
  el.classList.toggle('ui-screen--clear', opts.live === 'solo');
  $('settingsLiveNote').hidden = opts.live !== 'online';
  $('closeSettings').textContent = opts.live ? '⬅ BACK TO MATCH' : '⬅ BACK';
  afterClose = opts.onClose ?? null;
  leaveAction = opts.onLeave ?? null;
  leaveConfirm.reset();
  $('leaveMatch').hidden = !opts.onLeave;
  el.style.display = 'flex';
  // focusVisible:false: opening with Esc must not draw the keyboard ring on Back.
  $('closeSettings').focus({ focusVisible: false });
}

export function hideSettings() {
  stopPreview();
  leaveConfirm.reset();
  panel().style.display = 'none';
  const done = afterClose;
  afterClose = null;
  leaveAction = null;
  done?.();
}

/** The settings page: every `[data-setting]` input edits that setting. Opened from the main menu here and over a match from flow.ts. */
export function initSettingsPanel() {
  const menu = $('menu');
  const inputs = panel().querySelectorAll<HTMLInputElement>(
    'input[data-setting], select[data-setting]',
  );
  initMusicPickers();

  // the menu stays up underneath, so its music keeps playing while the volume is adjusted
  $('openSettings').addEventListener('click', () => {
    menu.inert = true;
    showSettings({
      onClose: () => {
        menu.inert = false;
        $('openSettings').focus();
      },
    });
  });
  $('closeSettings').addEventListener('click', hideSettings);
  $('leaveMatch').addEventListener('click', () => leaveConfirm.click());
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Escape' && settingsShowing()) hideSettings();
  });

  for (const input of inputs) {
    const key = input.dataset.setting as keyof Settings;
    input.addEventListener('input', () =>
      updateSettings({
        [key]:
          input.type === 'checkbox'
            ? input.checked
            : input.type === 'range'
              ? Number(input.value)
              : input.value,
      }),
    );
  }
  // fullscreen is the browser's, not a saved setting: it follows Esc and F11 as well as the switch
  const fullscreen = $<HTMLInputElement>('setFullscreen');
  if (document.fullscreenEnabled) {
    fullscreen.addEventListener('change', () =>
      fullscreen.checked ? document.documentElement.requestFullscreen() : document.exitFullscreen(),
    );
    document.addEventListener('fullscreenchange', () => {
      fullscreen.checked = !!document.fullscreenElement;
    });
  } else $('fullscreenRow').style.display = 'none';

  onSettings((s) => {
    for (const input of inputs) {
      const value = s[input.dataset.setting as keyof Settings];
      if (input.type === 'checkbox') input.checked = value as boolean;
      else if (input.type === 'range') {
        input.value = String(value);
        input.style.setProperty(
          '--fill',
          (100 * (+value - +input.min)) / (+input.max - +input.min) + '%',
        );
        const readout = panel().querySelector(`output[for="${input.id}"]`);
        if (readout) readout.textContent = String(value);
      } else {
        input.value = String(value);
        // a song that is no longer in its folder shows as Random
        if (input.value !== String(value)) input.value = 'random';
      }
    }
  });
}

/** Fills the two song dropdowns from the song folders, and wires their ▶ preview buttons. */
function initMusicPickers() {
  const kinds: Record<string, MusicKind> = { setMenuTrack: 'menu', setBattleTrack: 'battle' };
  for (const [id, kind] of Object.entries(kinds)) {
    const select = $<HTMLSelectElement>(id);
    select.replaceChildren(
      new Option('🎲 Random (shuffle)', 'random'),
      ...TRACKS[kind].map((t) => new Option(t.title, t.id)),
    );
  }
  const buttons = panel().querySelectorAll<HTMLButtonElement>('[data-preview]');
  let previewing: MusicKind | null = null;
  const label = () =>
    buttons.forEach((b) => {
      const on = isPreviewing() && previewing === b.dataset.preview;
      b.textContent = on ? '■' : '▶';
      b.title = on ? 'Stop' : 'Listen to this song';
    });
  onPreviewChange(label);
  for (const button of buttons) {
    button.addEventListener('click', async () => {
      const kind = button.dataset.preview as MusicKind;
      if (isPreviewing() && previewing === kind) return stopPreview();
      const choice = $<HTMLSelectElement>(
        kind === 'menu' ? 'setMenuTrack' : 'setBattleTrack',
      ).value;
      const track = previewTrack(kind, choice);
      if (!track) return;
      await unlockMusic();
      try {
        const song = await loadTrack(track.url);
        previewing = kind;
        startPreview(song);
      } catch (err) {
        console.warn('Arcane Duel preview:', err);
      }
    });
  }
}
