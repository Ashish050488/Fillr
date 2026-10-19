import { sendMessage } from '../../shared/messaging/extension-messages';
import type { Job } from '../../shared/types';
import type { FillResult } from '../fill/fill-types';
import type { WidgetElements } from './widget-markup';
import { readPostingUrl } from '../page/posting-url';

const VERDICT_LABELS: Record<string, string> = {
  strong: 'Strong match',
  good: 'Good match',
  stretch: 'A stretch',
  weak: 'Weak match',
};
const WEAK_FIT_BELOW_SCORE = 30;

export type StatusKind = 'normal' | 'error' | 'busy';

/** Everything the widget shows, as small operations on its elements. */
export function createWidgetView(elements: WidgetElements) {
  const showStatus = (statusText: string, kind: StatusKind = 'normal') => {
    elements.status.className = `state ${kind === 'error' ? 'err' : ''}`;
    elements.status.innerHTML = kind === 'busy' ? '<span class="spin"></span>' : '';
    elements.status.append(statusText);
  };

  const showFit = (job?: Job) => {
    const fit = job?.analysis;
    elements.scoreBadge.hidden = !fit;
    elements.scoreBadge.textContent = fit ? `${fit.score}%` : '';
    elements.fitBox.hidden = !fit;
    if (fit) {
      elements.fitTitle.textContent = `${fit.score}% · ${VERDICT_LABELS[fit.verdict] ?? fit.verdict}`;
      elements.fitLine.textContent = fit.headline;
    }
    elements.fillAnywayButton.hidden = !fit || fit.score >= WEAK_FIT_BELOW_SCORE;
  };

  const loadFit = () =>
    sendMessage('JOB_GET', { url: readPostingUrl() })
      .then((reply) => showFit(reply.job))
      .catch(() => undefined);

  const setOpen = (isOpen: boolean) => {
    elements.card.hidden = !isOpen;
    elements.launcher.hidden = isOpen;
    elements.detailsButton.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) void loadFit();
  };

  const showFillResult = (fillResult: FillResult) => {
    const message = fillResult.aiError ? `${fillResult.message} AI: ${fillResult.aiError}` : fillResult.message;
    showStatus(message, fillResult.success && !fillResult.aiError ? 'normal' : 'error');
    elements.skippedList.hidden = !fillResult.skipped?.length;
    elements.skippedList.querySelector('ul')!.replaceChildren(
      ...(fillResult.skipped ?? []).map((skippedLabel) => {
        const listItem = document.createElement('li');
        listItem.textContent = skippedLabel;
        return listItem;
      }),
    );
    elements.appliedButton.hidden = fillResult.filledCount === 0;
  };

  /** Progress and the result on the small launcher itself, for fills started without opening the card. */
  const showLauncherLabel = (labelText: string, isBusy = false) => {
    elements.quickFillLabel.innerHTML = isBusy ? '<span class="spin"></span>' : '';
    elements.quickFillLabel.append(labelText);
    elements.quickFillButton.disabled = isBusy;
  };

  return { showLauncherLabel, showStatus, showFit, loadFit, setOpen, showFillResult };
}

export type WidgetView = ReturnType<typeof createWidgetView>;
