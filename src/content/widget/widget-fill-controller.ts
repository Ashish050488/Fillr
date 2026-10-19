import { collectFillables } from '../form/collect-fillable-fields';
import { fillPage } from '../fill/fill-page';
import type { FillResult } from '../fill/fill-types';
import { readAskedJobCountry } from '../answers/remembered-answers';
import { isMultiStepSite } from './application-detection';
import { renderAskOncePanel } from './ask-once-panel';
import { readCurrentStep } from './step-tracking';
import type { WidgetElements } from './widget-markup';
import type { WidgetView } from './widget-view';
import { attemptedFields } from '../fill/fill-session';
import { hasValue, readLastFillReport } from '../fill/fill-report';
import { finishFillProgress, renderFillReport, showFillStage } from './widget-report';

const FILL_STEP_LABEL = 'Fill this step';
const QUICK_FILL_LABEL = 'Fill now';
const QUICK_RESULT_SHOWN_MILLISECONDS = 5000;
// Ashby and React forms re-create inputs on every change; never chase them in a loop.
const AUTO_FILL_COOLDOWN_MILLISECONDS = 6000;
const MAXIMUM_EMPTY_AUTO_FILLS = 2;
const POPUP_SELECTOR =
  '[role="dialog"], [role="listbox"], [role="grid"], [class*="calendar" i], [class*="picker" i], [class*="popover" i], [class*="menu" i]';

/**
 * Runs fills from the widget, the side panel or the keyboard shortcut (one at a time), and on
 * multi-step forms remembers to fill each later step once you have filled the first.
 */
export function createFillController(elements: WidgetElements, view: WidgetView) {
  const isMultiStep = isMultiStepSite();
  let runningFill: Promise<FillResult> | undefined;
  let shouldContinueSteps = false;
  let shouldForceSteps = false;
  let lastFilledStep = '';
  if (isMultiStep) {
    elements.fillButton.textContent = FILL_STEP_LABEL;
    elements.fillButton.dataset.label = FILL_STEP_LABEL;
  }
  const idleLauncherLabel = isMultiStep ? FILL_STEP_LABEL : QUICK_FILL_LABEL;
  view.showLauncherLabel(idleLauncherLabel);
  let resetLabelTimer: ReturnType<typeof setTimeout> | undefined;

  /** Quiet fills (the launcher's Fill button, later steps) keep the card closed and report on the launcher. */
  const fill = async (isForced = false, isAutomatic = false, isQuiet = false): Promise<FillResult> => {
    if (runningFill) return runningFill;
    const showsCard = !isQuiet || !elements.card.hidden;
    if (showsCard) view.setOpen(true);
    clearTimeout(resetLabelTimer);
    view.showLauncherLabel('Filling…', true);
    elements.fillButton.disabled = true;
    elements.fillAnywayButton.disabled = true;
    runningFill = fillPage({
      force: isForced,
      auto: isAutomatic,
      onProgress: (text) => view.showStatus(text, 'busy'),
      onStage: (stage) => view.showLauncherLabel(`Filling ${showFillStage(elements, stage)}%`, true),
    });
    try {
      const fillResult = await runningFill;
      // Once the first fill succeeds, later steps and fields rendered by an SPA fill themselves
      // after "Save and Continue" or after the user pauses.
      if (fillResult.success) {
        shouldContinueSteps = true;
        shouldForceSteps = isForced;
        lastFilledStep = readCurrentStep();
        if (isMultiStep) elements.stepNote.hidden = false;
      }
      if (!fillResult.success) shouldContinueSteps = false;
      view.showFillResult(fillResult);
      finishFillProgress(elements);
      const report = readLastFillReport();
      renderFillReport(elements, report);
      elements.skippedList.hidden = report.length > 0;
      await view.loadFit();
      if (fillResult.held) elements.fillAnywayButton.hidden = false;
      // A problem, a weak fit held back, or fields left for you: open the card so you see why.
      const askCount = renderAskOncePanel(elements.askPanel, readAskedJobCountry());
      // The questions are already listed above with their answers as buttons.
      if (askCount > 0) elements.skippedList.hidden = true;
      const hasRequiredLeft = report.some((row) => row.status === 'needs-you' && row.isRequired);
      const needsAttention =
        hasRequiredLeft || !fillResult.success || fillResult.held || Boolean(fillResult.aiError) || askCount > 0;
      if (needsAttention) view.setOpen(true);
      // An automatic pass that found nothing new stays quiet instead of flashing "Filled 0".
      if (isAutomatic && fillResult.success && fillResult.filledCount === 0) view.showLauncherLabel(idleLauncherLabel);
      else view.showLauncherLabel(fillResult.success ? `Filled ${fillResult.filledCount} ✓` : 'Not filled');
      resetLabelTimer = setTimeout(() => view.showLauncherLabel(idleLauncherLabel), QUICK_RESULT_SHOWN_MILLISECONDS);
      return fillResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not fill this form.';
      view.setOpen(true);
      elements.progress.hidden = true;
      view.showStatus(message, 'error');
      view.showLauncherLabel(idleLauncherLabel);
      return { success: false, message, filledCount: 0, totalCount: collectFillables().length, skippedCount: 0 };
    } finally {
      runningFill = undefined;
      elements.fillButton.disabled = false;
      elements.fillAnywayButton.disabled = false;
      elements.fillButton.textContent = elements.fillButton.dataset.label ?? 'Autofill again';
    }
  };

  /** A new step or a new field appeared since the last fill. */
  let lastAutoFillAt = 0;
  let emptyAutoFillCount = 0;

  /**
   * A new step, or a new empty field outside any popup. Re-rendered copies of fields that already
   * hold a value, and a calendar's or dropdown's own inputs, are not new questions.
   */
  const hasPendingFields = () => {
    if (!shouldContinueSteps || runningFill) return false;
    if (Date.now() - lastAutoFillAt < AUTO_FILL_COOLDOWN_MILLISECONDS) return false;
    if (readCurrentStep() !== lastFilledStep) {
      emptyAutoFillCount = 0;
      return true;
    }
    if (emptyAutoFillCount >= MAXIMUM_EMPTY_AUTO_FILLS) return false;
    const newFields = collectFillables().filter((field) => !attemptedFields.has(field));
    const ignoredFields = newFields.filter((field) => hasValue(field) || field.closest(POPUP_SELECTOR));
    ignoredFields.forEach((field) => attemptedFields.add(field));
    return newFields.length > ignoredFields.length;
  };

  const fillPendingFields = () => {
    lastFilledStep = readCurrentStep();
    lastAutoFillAt = Date.now();
    void fill(shouldForceSteps, true, true).then((fillResult) => {
      emptyAutoFillCount = fillResult.filledCount > 0 ? 0 : emptyAutoFillCount + 1;
    });
  };

  return { fill, hasPendingFields, fillPendingFields, isRunning: () => Boolean(runningFill) };
}
