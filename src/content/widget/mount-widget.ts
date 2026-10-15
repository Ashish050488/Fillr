import type { ContentScriptContext } from 'wxt/client';
import { onMessage, sendMessage } from '../../shared/messaging/extension-messages';
import { scanPage } from '../fill/page-scan';
import { collectFillables } from '../form/collect-fillable-fields';
import { readJobContext } from '../page/read-job-context';
import { watchSubmissions } from '../tracking/submission-watcher';
import { rememberAnswersGivenOnPage } from '../answers/remembered-answers';
import { looksLikeApplication } from './application-detection';
import { trackUserActivity } from './step-tracking';
import { createFillController } from './widget-fill-controller';
import { createWidget, WIDGET_HOST_ID } from './widget-markup';
import { createWidgetView } from './widget-view';
import { readPostingUrl } from '../page/posting-url';

const REFRESH_DELAY_MILLISECONDS = 400;
const USER_PAUSE_MILLISECONDS = 2500;
const RETRY_AFTER_USER_MILLISECONDS = 1500;

/** The in-page widget: buttons, live status, step-by-step filling and submission tracking. */
export function mountWidget(context: ContentScriptContext): void {
  const elements = createWidget();
  const view = createWidgetView(elements);
  const fillController = createFillController(elements, view);
  const userActivity = trackUserActivity(WIDGET_HOST_ID);
  context.onInvalidated(userActivity.stop);

  elements.quickFillButton.addEventListener('click', () => void fillController.fill(false, false, true));
  elements.detailsButton.addEventListener('click', () => view.setOpen(true));
  const closeCard = (shouldRefocus: boolean) => {
    if (elements.card.hidden) return;
    view.setOpen(false);
    if (shouldRefocus) elements.detailsButton.focus({ preventScroll: true });
  };
  elements.closeButton.addEventListener('click', () => closeCard(true));
  // Like any popover: a click anywhere outside the widget or Escape closes the card.
  const handleOutsidePointerDown = (event: PointerEvent) => {
    if (!event.composedPath().includes(elements.host)) closeCard(false);
  };
  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !elements.card.hidden) closeCard(event.composedPath().includes(elements.host));
  };
  document.addEventListener('pointerdown', handleOutsidePointerDown, true);
  // Answers you picked on the page yourself are remembered as you move to the next step.
  const handleContinuePointerDown = (event: PointerEvent) => {
    const button = (event.target as Element | null)?.closest?.('button, [role="button"], input[type="submit"]');
    const buttonText = (button?.textContent || (button as HTMLInputElement | null)?.value || '').trim();
    if (/^(save and continue|continue|next|submit|review|submit application)$/i.test(buttonText))
      rememberAnswersGivenOnPage();
  };
  document.addEventListener('pointerdown', handleContinuePointerDown, true);
  document.addEventListener('keydown', handleEscapeKey, true);
  context.onInvalidated(() => {
    document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    document.removeEventListener('pointerdown', handleContinuePointerDown, true);
    document.removeEventListener('keydown', handleEscapeKey, true);
  });
  elements.fillButton.addEventListener('click', () => void fillController.fill());
  elements.fillAnywayButton.addEventListener('click', () => void fillController.fill(true));
  elements.openPanelButton.addEventListener('click', () => {
    void sendMessage('OPEN_PANEL', undefined)
      .then((reply) => reply.error && !reply.success && view.showStatus(reply.error))
      .catch(() => undefined);
  });
  elements.appliedButton.addEventListener('click', async () => {
    elements.appliedButton.disabled = true;
    try {
      const reply = await sendMessage('MARK_JOB_APPLIED', { url: readPostingUrl() });
      if (!reply.success) throw new Error(reply.error ?? 'Could not update your tracker.');
      view.showStatus('Marked as applied. Good luck.');
      elements.appliedButton.hidden = true;
    } catch (error) {
      view.showStatus(error instanceof Error ? error.message : 'Could not update your tracker.', 'error');
    } finally {
      elements.appliedButton.disabled = false;
    }
  });

  let isRefreshScheduled = false;
  let hasLoadedFit = false;
  const refreshWidget = () => {
    if (isRefreshScheduled) return;
    isRefreshScheduled = true;
    context.setTimeout(() => {
      isRefreshScheduled = false;
      if (!elements.host.isConnected) document.documentElement.append(elements.host);
      if (fillController.hasNewStep() && collectFillables().length >= 2) {
        // Never interrupt you: wait until you have paused clicking and typing.
        if (userActivity.millisecondsSinceLastAction() < USER_PAUSE_MILLISECONDS)
          context.setTimeout(refreshWidget, RETRY_AFTER_USER_MILLISECONDS);
        else fillController.fillNewStep();
        return;
      }
      // Never hide the widget mid-fill or once you have opened it.
      if (fillController.isRunning() || !elements.card.hidden) return;
      elements.host.hidden = !looksLikeApplication(collectFillables().length);
      if (!elements.host.hidden && !hasLoadedFit) {
        hasLoadedFit = true;
        void view.loadFit();
      }
    }, REFRESH_DELAY_MILLISECONDS);
  };
  refreshWidget();
  const pageObserver = new MutationObserver(refreshWidget);
  pageObserver.observe(document.documentElement, { childList: true, subtree: true });
  context.onInvalidated(() => {
    pageObserver.disconnect();
    elements.host.remove();
  });

  onMessage('DETECT_FORM', () => {
    const fieldCount = collectFillables().length;
    return { found: fieldCount > 0, inputCount: fieldCount };
  });
  onMessage('SCAN_PAGE', async () => ({ success: true, scan: await scanPage() }));
  onMessage('FILL_FORM', async (payload) => {
    elements.host.hidden = false;
    return fillController.fill(payload?.force ?? false);
  });
  // Progress from the background while AI works; also reached when the side panel started the fill.
  chrome.runtime.onMessage.addListener((message: { action?: string; payload?: { text?: string } }) => {
    if (message?.action === 'FILL_PROGRESS' && message.payload?.text && fillController.isRunning()) {
      view.showStatus(message.payload.text, 'busy');
    }
    return false;
  });

  // The tracker updates itself once the site confirms the application went through.
  const stopWatchingSubmissions = watchSubmissions((applicationUrl) => {
    const jobContext = readJobContext();
    void sendMessage('MARK_JOB_APPLIED', {
      url: applicationUrl,
      jobTitle: jobContext.jobTitle,
      company: jobContext.company,
      atsUrl: jobContext.atsUrl,
      auto: true,
    })
      .then((reply) => {
        if (!reply.success) return;
        elements.host.hidden = false;
        view.setOpen(true);
        view.showStatus(`Applied${reply.jobTitle ? ` to ${reply.jobTitle}` : ''}. Saved to your tracker.`);
        elements.appliedButton.hidden = true;
      })
      .catch(() => undefined);
  });
  context.onInvalidated(stopWatchingSubmissions);
}
