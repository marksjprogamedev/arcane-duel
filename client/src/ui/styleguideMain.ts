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

const demoIcons = Array.from({ length: 12 }, (_, i) => {
  const icon = document.createElement('span');
  icon.className = 'ui-carousel__icon';
  icon.textContent = '🥾';
  return { value: i, label: 'Choice ' + (i + 1), icon };
});
document.getElementById('sg-carousel')!.append(
  createCarousel({
    name: 'sg-carousel',
    label: 'Demo choices',
    items: demoIcons,
    selected: 0,
    onPick: () => {},
  }),
);
