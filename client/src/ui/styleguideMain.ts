import { enhanceSelects } from './select';
import { initTabs } from './tabs';
import { showActionToasts, showToast } from './toast';
import { createCarousel } from '../workshop/carousel';

enhanceSelects();
initTabs(document.getElementById('sg-tabs')!);
document
  .getElementById('sg-toast')!
  .addEventListener('click', () => showToast('Display name saved.'));
document.getElementById('sg-invite-toast')!.addEventListener('click', () => {
  const dismiss = () => showActionToasts([]);
  showActionToasts([
    {
      key: 'sg',
      text: 'Merlin (@merlin) invites you to a lobby.',
      actions: [
        { label: 'Join', colour: 'is-green', onClick: dismiss },
        { label: 'Dismiss', colour: 'is-beige', onClick: dismiss },
      ],
    },
  ]);
});

function demoCarousel(id: string, size: 'normal' | 'tall', glyph: string) {
  const items = Array.from({ length: 12 }, (_, i) => {
    const icon = document.createElement('span');
    icon.className = 'ui-carousel__icon' + (i === 0 ? ' ui-carousel__icon--none' : '');
    if (i > 0) icon.textContent = glyph;
    return { value: i, label: i === 0 ? 'None' : 'Choice ' + i, icon };
  });
  document.getElementById(id)!.append(
    createCarousel({
      name: id,
      label: 'Demo choices',
      items,
      selected: 1,
      size,
      onPick: () => {},
    }),
  );
}
demoCarousel('sg-carousel', 'normal', '🥾');
demoCarousel('sg-carousel-tall', 'tall', '🪄');
