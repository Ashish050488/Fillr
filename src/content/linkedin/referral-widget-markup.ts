import { LOGO_SVG } from '../../shared/brand/logo-svg';
import { WIDGET_STYLES } from '../widget/widget-styles';

export const REFERRAL_HOST_ID = 'jobfill-referral-host';

// Same place and look as the Fill now widget; lifted above LinkedIn's "Messaging" bar.
const REFERRAL_STYLES = `
.wrap { bottom: 64px; }
.card { width: min(340px, calc(100vw - 40px)); padding: 12px 14px; }
.head { margin-bottom: 6px; } .head b { font-size: 21px; }
.hint { margin: 0 0 8px; color: var(--muted); font-size: 11.5px; }
.options { margin: 0 0 4px; border: 1.5px dashed var(--ink); padding: 6px 8px; }
.options summary { font-size: 12px; font-weight: 650; list-style: none; display: flex; justify-content: space-between; }
.options summary::-webkit-details-marker { display: none; }
.options summary::after { content: "Change"; text-decoration: underline; font-weight: 500; color: var(--muted); }
.options[open] summary::after { content: "Done"; }
.field { width: 100%; margin-top: 6px; padding: 5px 2px; font-size: 12.5px; color: var(--ink); background: transparent; border: 0; border-bottom: 1.5px solid var(--ink); }
.field:focus { outline: none; border-bottom-width: 2px; }
.ask-options { margin-top: 8px; gap: 5px; } .ask-option { min-height: 26px; padding: 2px 9px; font-size: 12px; }
.ask-options .ask-option.on { background: var(--ink); color: var(--paper); }
.btn { min-height: 36px; margin-top: 6px; }
.state { margin: 6px 0 0; font-size: 12px; }
.insight { margin: 8px 0 0; padding: 5px 8px; border: 1.5px dashed var(--ink); font-size: 11.5px; cursor: pointer;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.insight.expanded { display: block; } .insight b { margin-right: 4px; }
.tabs { display: flex; gap: 0; margin: 8px 0 0; border-bottom: 1.5px solid var(--ink); }
.tab { flex: 1; min-height: 28px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--muted); background: none; border: 0; border-bottom: 3px solid transparent; margin-bottom: -1.5px; transition: color .12s ease, background .12s ease; }
.tab:hover { background: rgba(0,0,0,.05); } .tab.on { color: var(--ink); border-bottom-color: var(--ink); }
.subject { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 12px; }
.subject span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.draft { width: 100%; height: 150px; margin-top: 6px; padding: 7px 8px; resize: none; font-size: 12.5px; line-height: 1.5; color: var(--ink); background: var(--paper); border: 1.5px dashed var(--ink); }
.draft:focus { outline: none; border-style: solid; }
.count { margin: 1px 0 0; color: var(--muted); font-size: 11px; text-align: right; }
.count.over { color: var(--ink); font-weight: 700; }
.actions { display: flex; gap: 6px; align-items: stretch; } .actions .btn.primary { flex: 1; }
.icon-btn { width: 38px; min-height: 36px; margin-top: 6px; display: grid; place-items: center; cursor: pointer; color: var(--ink); background: var(--paper); border: 1.5px solid var(--ink); box-shadow: 2px 2px 0 var(--ink); transition: transform .12s ease, box-shadow .12s ease; }
.icon-btn:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 var(--ink); } .icon-btn:active { transform: translate(2px,2px); box-shadow: none; }
.icon-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.mini { padding: 2px 8px; font-size: 11px; cursor: pointer; color: var(--ink); background: var(--paper); border: 1.2px solid var(--ink); }
.link { margin-top: 6px; }`;

const GOAL_OPTIONS = [
  ['auto', 'Let JobFill decide'],
  ['referral', 'Referral'],
  ['job', 'Role at their company'],
  ['advice', 'Advice'],
  ['followup', 'Follow-up'],
] as const;

export interface ReferralWidgetElements {
  host: HTMLElement;
  quickButton: HTMLButtonElement;
  quickLabel: HTMLElement;
  openButton: HTMLButtonElement;
  card: HTMLElement;
  closeButton: HTMLButtonElement;
  jobLinkInput: HTMLInputElement;
  goalButtons: HTMLButtonElement[];
  options: HTMLDetailsElement;
  optionsSummary: HTMLElement;
  subjectRow: HTMLElement;
  subject: HTMLElement;
  copySubjectButton: HTMLButtonElement;
  insight: HTMLElement;
  writeButton: HTMLButtonElement;
  state: HTMLElement;
  result: HTMLElement;
  tabButtons: HTMLButtonElement[];
  draftBox: HTMLTextAreaElement;
  characterCount: HTMLElement;
  insertButton: HTMLButtonElement;
  copyButton: HTMLButtonElement;
  gmailButton: HTMLButtonElement;
  sentButton: HTMLButtonElement;
}

export function createReferralWidget(): ReferralWidgetElements {
  const host = document.createElement('div');
  host.id = REFERRAL_HOST_ID;
  host.hidden = true;
  const shadow = host.attachShadow({ mode: 'open' });
  const goalButtons = GOAL_OPTIONS.map(
    ([goal, label]) =>
      `<button class="ask-option r1${goal === 'auto' ? ' on' : ''}" type="button" role="radio" aria-checked="${goal === 'auto'}" data-goal="${goal}">${label}</button>`,
  ).join('');
  shadow.innerHTML = `<style>${WIDGET_STYLES}${REFERRAL_STYLES}</style>
    <div class="wrap">
      <div class="card r2" id="card" role="dialog" aria-label="Ask for a referral" hidden>
        <div class="head"><span class="logo">${LOGO_SVG}</span><b>Ask for a referral</b><button class="x" id="close" type="button" aria-label="Close">×</button></div>
        <p class="hint">Reads this profile and their posts, writes it; you press Send.</p>
        <details class="options" id="options">
          <summary id="options-summary">Ask for: let JobFill decide</summary>
          <input class="field" id="job-link" type="url" placeholder="Job link (optional)">
          <div class="ask-options" role="radiogroup" aria-label="Ask for">${goalButtons}</div>
        </details>
        <button class="btn primary r1" id="write" type="button">Write message</button>
        <p class="state" id="state" role="status" aria-live="polite"></p>
        <div id="result" hidden>
          <p class="insight" id="insight" title="Click to read it all" hidden></p>
          <div class="tabs" role="tablist">
            <button class="tab on" type="button" role="tab" data-tab="message">Message</button>
            <button class="tab" type="button" role="tab" data-tab="invitationNote">Connect note</button>
            <button class="tab" type="button" role="tab" data-tab="email">Email</button>
          </div>
          <p class="subject" id="subject-row" hidden><b>Subject</b><span id="subject"></span><button class="mini" id="copy-subject" type="button">Copy</button></p>
          <textarea class="draft" id="draft" aria-label="Message draft"></textarea>
          <p class="count" id="count"></p>
          <div class="actions">
            <button class="btn primary r1" id="insert" type="button">Put in LinkedIn box</button>
            <button class="btn r2" id="gmail" type="button" hidden>Open in Gmail</button>
            <button class="icon-btn r2" id="copy" type="button" aria-label="Copy" title="Copy"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg></button>
          </div>
          <button class="link" id="sent" type="button">I sent it myself, count it</button>
        </div>
      </div>
      <div class="fab r1" id="launcher">
        <button class="quick" id="quick" type="button" title="Write the message and put it in their Message box"><span class="logo">${LOGO_SVG}</span><span id="quick-label">Write referral</span></button>
        <button class="more" id="open" type="button" aria-label="Show options and the draft" aria-haspopup="dialog" aria-expanded="false"><svg class="chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 6.5c1.6-1.4 3.3-3 5-4.8 1.6 1.9 3.3 3.4 5 4.9"/></svg></button>
      </div>
    </div>`;
  const find = <Element extends HTMLElement>(elementId: string) => shadow.getElementById(elementId) as Element;
  return {
    host,
    quickButton: find('quick'),
    quickLabel: find('quick-label'),
    openButton: find('open'),
    card: find('card'),
    closeButton: find('close'),
    jobLinkInput: find('job-link'),
    goalButtons: Array.from(shadow.querySelectorAll<HTMLButtonElement>('[data-goal]')),
    options: find('options'),
    optionsSummary: find('options-summary'),
    subjectRow: find('subject-row'),
    subject: find('subject'),
    copySubjectButton: find('copy-subject'),
    insight: find('insight'),
    writeButton: find('write'),
    state: find('state'),
    result: find('result'),
    tabButtons: Array.from(shadow.querySelectorAll<HTMLButtonElement>('.tab')),
    draftBox: find('draft'),
    characterCount: find('count'),
    insertButton: find('insert'),
    copyButton: find('copy'),
    gmailButton: find('gmail'),
    sentButton: find('sent'),
  };
}
