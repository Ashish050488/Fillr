import { describe, expect, it } from 'vitest';
import { isMachineId } from './question-label';

describe('isMachineId', () => {
  it('spots generated ids, with dashes or with spaces', () => {
    expect(isMachineId('ffc70292-623d-4bf5-a854-e884db16ef2d')).toBe(true);
    expect(isMachineId('ffc70292 623d 4bf5 a854 e884db16ef2d')).toBe(true);
    expect(isMachineId('1baa341f-99e5-47ee-90cd-e79607c1df99_ffc70292-623d-4bf5-a854-e884db16ef2d')).toBe(true);
    expect(isMachineId('_systemfield_name')).toBe(true);
  });

  it('keeps real labels and readable keys', () => {
    expect(isMachineId('Preferred Start Date')).toBe(false);
    expect(isMachineId('first_name')).toBe(false);
    expect(isMachineId('LinkedIn')).toBe(false);
  });
});
