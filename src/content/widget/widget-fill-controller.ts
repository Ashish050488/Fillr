import { collectFillables } from '../form/collect-fillable-fields';
import { fillPage } from '../fill/fill-page';
import type { FillResult } from '../fill/fill-types';
import { readAskedJobCountry } from '../answers/remembered-answers';
import { isMultiStepSite } from './application-detection';
import { renderAskOncePanel } from './ask-once-panel';
import { readCurrentStep } from './step-tracking';
import type { WidgetElements } from './widget-markup';
import type { WidgetView } from './widget-view';

const FILL_STEP_LABEL = 'Fill this step';
const QUICK_FILL_LABEL = 'Fill now';
const QUICK_RESULT_SHOWN_MILLISECONDS = 5000;

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
    });
    try {
      const fillResult = await runningFill;
      // Once you have filled one step, every later step fills itself after "Save and Continue".
      if (isMultiStep && fillResult.success) {
        shouldContinueSteps = true;
        shouldForceSteps = isForced;
        lastFilledStep = readCurrentStep();
        elements.stepNote.hidden = false;
      }
      if (!fillResult.success) shouldContinueSteps = false;
      view.showFillResult(fillResult);
      await view.loadFit();
      if (fillResult.held) elements.fillAnywayButton.hidden = false;
      // A problem, a weak fit held back, or fields left for you: open the card so you see why.
      const askCount = renderAskOncePanel(elements.askPanel, readAskedJobCountry());
      // The questions are already listed above with their answers as buttons.
      if (askCount > 0) elements.skippedList.hidden = true;
      const needsAttention = !fillResult.success || fillResult.held || Boolean(fillResult.aiError) || askCount > 0;
      if (needsAttention) view.setOpen(true);
      view.showLauncherLabel(fillResult.success ? `Filled ${fillResult.filledCount} ✓` : 'Not filled');
      resetLabelTimer = setTimeout(() => view.showLauncherLabel(idleLauncherLabel), QUICK_RESULT_SHOWN_MILLISECONDS);
      return fillResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not fill this form.';
      view.setOpen(true);
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

  /** A new step appeared since the last fill (multi-step forms only). */
  const hasNewStep = () => shouldContinueSteps && !runningFill && readCurrentStep() !== lastFilledStep;

  const fillNewStep = () => {
    lastFilledStep = readCurrentStep();
    void fill(shouldForceSteps, true, true);
  };

  return { fill, hasNewStep, fillNewStep, isRunning: () => Boolean(runningFill) };
}
