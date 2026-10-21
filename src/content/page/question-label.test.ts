import { describe, expect, it } from 'vitest';
import { isMachineId, stripMachineIds } from './question-label';

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

describe('stripMachineIds', () => {
  it('drops image ids and hashes that leak into visible text', () => {
    expect(stripMachineIds('6c25a598-02f2-4035-a8e1-c0db110c90ad@2.00xRemote only')).toBe('Remote only');
    expect(stripMachineIds('Logo a1b2c3d4e5f60718293a Taskwiser')).toBe('Logo Taskwiser');
  });

  it('leaves real words and numbers alone', () => {
    expect(stripMachineIds('Software Engineer — 2024 graduates, 5 years')).toBe(
      'Software Engineer — 2024 graduates, 5 years',
    );
  });
});
