import { $ } from '../dom';
import { onSettings, updateSettings, type Settings } from '../settings';

const panel = () => $('settings');

/** True while the settings page is showing, from the menu or over a match. */
export const settingsShowing = () => panel().style.display === 'flex';

let afterClose: (() => void) | null = null;

/**
 * Shows the settings page. `live` is set over a match: 'online' leaves the match running (a lighter dim and a
 * reminder), 'solo' sits over the pause screen. `onClose` runs once when the page goes away.
 */
export function showSettings(opts: { live?: 'online' | 'solo'; onClose?: () => void } = {}) {
  const el = panel();
  el.classList.toggle('ui-screen--live', opts.live === 'online');
  el.classList.toggle('ui-screen--clear', opts.live === 'solo');
  $('settingsLiveNote').hidden = opts.live !== 'online';
  $('closeSettings').textContent = opts.live ? '⬅ BACK TO MATCH' : '⬅ BACK';
  afterClose = opts.onClose ?? null;
  el.style.display = 'flex';
  $('closeSettings').focus();
}

export function hideSettings() {
  panel().style.display = 'none';
  const done = afterClose;
  afterClose = null;
  done?.();
}

/** The settings page: every `[data-setting]` input edits that setting. Opened from the main menu here and over a match from flow.ts. */
export function initSettingsPanel() {
  const menu = $('menu');
  const inputs = panel().querySelectorAll<HTMLInputElement>('input[data-setting]');

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
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Escape' && settingsShowing()) hideSettings();
  });

  for (const input of inputs) {
    const key = input.dataset.setting as keyof Settings;
    input.addEventListener('input', () =>
      updateSettings({ [key]: input.type === 'checkbox' ? input.checked : Number(input.value) }),
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
      else {
        input.value = String(value);
        input.style.setProperty(
          '--fill',
          (100 * (+value - +input.min)) / (+input.max - +input.min) + '%',
        );
        const readout = panel().querySelector(`output[for="${input.id}"]`);
        if (readout) readout.textContent = String(value);
      }
    }
  });
}
