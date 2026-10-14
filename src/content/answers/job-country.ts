import { findCountry } from '../../shared/geography/find-country';
import { sendMessage } from '../../shared/messaging/extension-messages';

const LOCATION_SELECTORS = [
  '[data-automation-id="locations"]',
  '[data-automation-id="jobPostingLocation"]',
  '[class*="location"]',
  '[data-qa*="location"]',
];

/**
 * The country this job is in, for answers that depend on it (work permit, sponsorship):
 * from the saved posting first, then from a location shown on the page.
 */
export async function readJobCountry(): Promise<string | undefined> {
  const reply = await sendMessage('JOB_GET', { url: location.href }).catch(() => undefined);
  const savedLocation = reply?.job?.jobFacts?.location;
  const savedCountry = findCountry(savedLocation);
  if (savedCountry) return savedCountry;
  for (const selector of LOCATION_SELECTORS) {
    const pageCountry = findCountry(document.querySelector(selector)?.textContent ?? undefined);
    if (pageCountry) return pageCountry;
  }
  return undefined;
}
