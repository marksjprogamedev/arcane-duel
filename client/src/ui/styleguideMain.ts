import { enhanceSelects } from './select';
import { initTabs } from './tabs';
import { showToast } from './toast';

enhanceSelects();
initTabs(document.getElementById('sg-tabs')!);
document
  .getElementById('sg-toast')!
  .addEventListener('click', () => showToast('Display name saved.'));
