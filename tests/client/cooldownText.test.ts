import { describe, expect, it } from 'vitest';
import { cooldownSeconds } from '../../client/src/ui/cooldownText';

describe('cooldown readout', () => {
  it('shows one decimal under ten seconds', () => {
    expect(cooldownSeconds(30)).toBe('0.5');
    expect(cooldownSeconds(1)).toBe('0.0');
    expect(cooldownSeconds(590)).toBe('9.8');
  });

  it('shows whole seconds, rounded up, from ten seconds', () => {
    expect(cooldownSeconds(599)).toBe('10');
    expect(cooldownSeconds(600)).toBe('10');
    expect(cooldownSeconds(601)).toBe('11');
    expect(cooldownSeconds(1500)).toBe('25');
  });
});
