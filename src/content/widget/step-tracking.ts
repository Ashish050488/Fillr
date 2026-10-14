const PROGRESS_SELECTORS =
  '[data-automation-id^="progressBar"], [role="progressbar"], nav[aria-label*="progress" i], ol[aria-label*="step" i]';

/**
 * Which step of a multi-step form is showing. Workday's progress bar carries screen-reader text
 * "current step 2 of 5"; other ATSs mark the active step with aria-current. Fields are not used:
 * Workday re-renders them constantly, and treating every re-render as a new step stole focus.
 */
export function readCurrentStep(): string {
  const progressBar = document.querySelector(PROGRESS_SELECTORS);
  const progressText = progressBar?.textContent ?? document.body?.textContent ?? '';
  const stepNumber =
    progressText.match(/current step\s*(\d+)\s*of\s*(\d+)/i)?.[1] ??
    document.querySelector('[aria-current="step"]')?.textContent?.trim().slice(0, 60) ??
    '';
  return `${location.pathname}|${stepNumber}`;
}

/** When you last clicked or typed on the page (outside the widget), so automatic fills wait for you. */
export function trackUserActivity(widgetHostId: string) {
  let lastActionAt = 0;
  const recordAction = (event: Event) => {
    const isOnWidget = (event.target as Element)?.closest?.(`#${widgetHostId}`);
    if (event.isTrusted && !isOnWidget) lastActionAt = Date.now();
  };
  document.addEventListener('mousedown', recordAction, true);
  document.addEventListener('keydown', recordAction, true);
  return {
    millisecondsSinceLastAction: () => Date.now() - lastActionAt,
    stop: () => {
      document.removeEventListener('mousedown', recordAction, true);
      document.removeEventListener('keydown', recordAction, true);
    },
  };
}
