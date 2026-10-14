import { describe, expect, it } from 'vitest';
import { bestMatch } from './match-profile-field';

function field(attributes: Record<string, string>, nearby = ''): Element {
  return {
    ...attributes,
    labels: [],
    parentElement: { textContent: nearby },
    getAttribute: (name: string) => attributes[name] ?? null,
  } as unknown as Element;
}

describe('form matcher', () => {
  it('scores accessible labels and common aliases', () => {
    const match = bestMatch(
      field({ name: 'candidate_email', placeholder: 'Email address', type: 'email', autocomplete: 'email' }),
      { email: 'a@example.com' },
    );
    expect(match?.key).toBe('email');
    expect(match?.value).toBe('a@example.com');
  });

  it('leaves uncertain fields unmatched', () => {
    expect(
      bestMatch(field({ name: 'misc', placeholder: 'Tell us something', type: 'text' }), {
        email: 'a@example.com',
        phone: '555',
      }),
    ).toBeUndefined();
  });

  it('recognises Indian compensation and notice fields', () => {
    expect(bestMatch(field({ name: 'current_ctc', type: 'text' }), { currentCtc: '12 LPA' })?.key).toBe('currentCtc');
    expect(bestMatch(field({ name: 'notice_period', type: 'text' }), { noticePeriod: '30 days' })?.key).toBe(
      'noticePeriod',
    );
  });

  it('does not put a full name into first or last name fields', () => {
    const profile = { name: 'Sample Person', firstName: 'Sample', lastName: 'Person' };
    expect(bestMatch(field({ 'aria-label': 'First name' }), profile)?.value).toBe('Sample');
    expect(bestMatch(field({ autocomplete: 'family-name' }), profile)?.value).toBe('Person');
    expect(bestMatch(field({ name: 'first_name' }), { name: 'Sample Person' })).toBeUndefined();
  });

  it('keeps different links separate and skips ambiguous labels', () => {
    const profile = {
      github: 'https://github.com/sample',
      linkedin: 'https://example.com/linkedin',
      portfolio: 'https://example.com',
    };
    expect(bestMatch(field({ name: 'LinkedIn URL' }), profile)?.key).toBe('linkedin');
    expect(bestMatch(field({ name: 'GitHub URL' }), profile)?.key).toBe('github');
    expect(bestMatch(field({ name: 'GitHub or LinkedIn' }), profile)).toBeUndefined();
  });

  it('never fills salary without a saved value, or treats nearby text alone as a label', () => {
    expect(bestMatch(field({ name: 'expected_ctc' }), { name: 'Sample', expectedCtc: '' })).toBeUndefined();
    expect(
      bestMatch(field({ name: 'unknown' }, 'Email phone full name'), { name: 'Sample', email: 'a@example.com' }),
    ).toBeUndefined();
    expect(bestMatch(field({ name: 'accept_terms' }), { name: 'Sample', workAuthorization: 'yes' })).toBeUndefined();
  });

  it('reads Workday data-automation-id names, old and new style', () => {
    const profile = {
      firstName: 'Sample',
      lastName: 'Person',
      email: 'a@example.com',
      postalCode: '560001',
      location: 'Bengaluru',
    };
    expect(bestMatch(field({ 'data-automation-id': 'legalNameSection_firstName', type: 'text' }), profile)?.key).toBe(
      'firstName',
    );
    expect(bestMatch(field({ id: 'name--legalName--lastName', type: 'text' }), profile)?.key).toBe('lastName');
    expect(bestMatch(field({ 'data-automation-id': 'addressSection_postalCode', type: 'text' }), profile)?.key).toBe(
      'postalCode',
    );
    expect(bestMatch(field({ 'data-automation-id': 'addressSection_city', type: 'text' }), profile)?.key).toBe(
      'location',
    );
  });

  it('never puts the phone number into Phone Extension or Phone Device Type', () => {
    const profile = { phone: '+91 98355 90439', phoneDeviceType: 'Mobile' };
    expect(bestMatch(field({ 'aria-label': 'Phone Extension', type: 'text' }), profile)).toBeUndefined();
    expect(bestMatch(field({ 'aria-label': 'Phone Device Type', type: 'button' }), profile)?.key).toBe(
      'phoneDeviceType',
    );
    expect(bestMatch(field({ 'aria-label': 'Phone Number', type: 'text' }), profile)?.key).toBe('phone');
  });
});
