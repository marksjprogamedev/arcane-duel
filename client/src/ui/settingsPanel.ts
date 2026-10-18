import { $ } from '../dom';
import { onSettings, updateSettings, type Settings } from '../settings';

/** The settings page opened from the main menu: every `[data-setting]` input edits that setting. */
export function initSettingsPanel() {
  const panel = $('settings');
  const menu = $('menu');
  const inputs = panel.querySelectorAll<HTMLInputElement>('input[data-setting]');

  const close = () => {
    panel.style.display = 'none';
    menu.inert = false;
    $('openSettings').focus();
  };
  // the menu stays up underneath, so its music keeps playing while the volume is adjusted
  $('openSettings').addEventListener('click', () => {
    panel.style.display = 'flex';
    menu.inert = true;
    $('closeSettings').focus();
  });
  $('closeSettings').addEventListener('click', close);
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Escape' && panel.style.display === 'flex') close();
  });

  for (const input of inputs) {
    const key = input.dataset.setting as keyof Settings;
    input.addEventListener('input', () =>
      updateSettings({ [key]: input.type === 'checkbox' ? input.checked : Number(input.value) }),
    );
  }
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
        const readout = panel.querySelector(`output[for="${input.id}"]`);
        if (readout) readout.textContent = String(value);
      }
    }
  });
}
