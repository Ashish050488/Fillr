import { LOGO_SVG } from '../../shared/brand/logo-svg';
import { WIDGET_STYLES } from './widget-styles';
import { WIDGET_REPORT_STYLES } from './widget-report-styles';

export const WIDGET_HOST_ID = 'jobfill-panel-host';

/** Every element of the widget the code reads or changes. */
export interface WidgetElements {
  host: HTMLDivElement;
  card: HTMLElement;
  launcher: HTMLElement;
  quickFillButton: HTMLButtonElement;
  quickFillLabel: HTMLElement;
  detailsButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  fillButton: HTMLButtonElement;
  fillAnywayButton: HTMLButtonElement;
  appliedButton: HTMLButtonElement;
  openPanelButton: HTMLButtonElement;
  status: HTMLElement;
  stepNote: HTMLElement;
  skippedList: HTMLDetailsElement;
  askPanel: HTMLElement;
  scoreBadge: HTMLElement;
  fitBox: HTMLElement;
  fitTitle: HTMLElement;
  fitLine: HTMLElement;
  progress: HTMLElement;
  progressBar: HTMLElement;
  stages: HTMLOListElement;
  report: HTMLElement;
  doneBanner: HTMLElement;
  doneLine: HTMLElement;
  doneTrackerButton: HTMLButtonElement;
}

/** Build the widget in a closed-off shadow root so page styles never leak in or out. */
export function createWidget(): WidgetElements {
  document.getElementById(WIDGET_HOST_ID)?.remove();
  const host = document.createElement('div');
  host.id = WIDGET_HOST_ID;
  host.hidden = true;
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${WIDGET_STYLES}${WIDGET_REPORT_STYLES}</style><div class="wrap">
      <section class="card r1" id="card" hidden aria-label="JobFill">
        <div class="head"><span class="logo">${LOGO_SVG}</span><b>JobFill</b><button class="x" id="close" type="button" aria-label="Close">×</button></div>
        <div class="fit r2" id="fit" hidden><strong id="fit-title"></strong><p id="fit-line"></p></div>
        <button class="btn primary r2" id="fill" type="button">Autofill application</button>
        <button class="btn r1" id="force" type="button" hidden>Fill everything anyway</button>
        <div class="done-banner r2" id="done" hidden><b>Submitted!</b><p id="done-line"></p><button class="btn r1" id="done-tracker" type="button">Open my tracker</button></div>
        <div class="progress" id="progress" hidden><div class="bar r1"><i id="bar"></i></div><ol class="stages" id="stages"><li>Reading form</li><li>Your details</li><li>Answers</li><li>Checking</li></ol></div>
        <p class="state" id="state" role="status">Fills your details, the cover letter and every question. You review and submit.</p>
        <p class="step-note" id="step-note" hidden>Each next step fills itself after you press Save and Continue.</p>
        <div class="ask" id="ask" hidden></div>
        <div class="report" id="report" hidden></div>
        <details hidden id="skipped"><summary>Left for you</summary><ul></ul></details>
        <button class="btn r1" id="applied" type="button" hidden>I submitted it</button>
        <button class="link" id="panel" type="button">Open the full panel</button>
      </section>
      <div class="fab r2" id="launcher">
        <button class="quick" id="quick-fill" type="button" title="Fill this application now"><span class="logo">${LOGO_SVG}</span><span id="quick-label">Fill now</span></button>
        <button class="more" id="details" type="button" aria-label="Show fit and details" aria-haspopup="dialog" aria-expanded="false"><span class="score" id="badge" hidden></span><svg class="chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 6.5c1.6-1.4 3.3-3 5-4.8 1.6 1.9 3.3 3.4 5 4.9"/></svg></button>
      </div>
    </div>`;
  const getElement = <Element extends HTMLElement>(elementId: string) => shadow.getElementById(elementId) as Element;
  return {
    host,
    card: getElement('card'),
    launcher: getElement('launcher'),
    quickFillButton: getElement('quick-fill'),
    quickFillLabel: getElement('quick-label'),
    detailsButton: getElement('details'),
    closeButton: getElement('close'),
    fillButton: getElement('fill'),
    fillAnywayButton: getElement('force'),
    appliedButton: getElement('applied'),
    openPanelButton: getElement('panel'),
    status: getElement('state'),
    stepNote: getElement('step-note'),
    skippedList: getElement('skipped'),
    askPanel: getElement('ask'),
    scoreBadge: getElement('badge'),
    fitBox: getElement('fit'),
    fitTitle: getElement('fit-title'),
    fitLine: getElement('fit-line'),
    progress: getElement('progress'),
    progressBar: getElement('bar'),
    stages: getElement('stages'),
    report: getElement('report'),
    doneBanner: getElement('done'),
    doneLine: getElement('done-line'),
    doneTrackerButton: getElement('done-tracker'),
  };
}
