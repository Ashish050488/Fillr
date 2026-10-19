/** Progress stages, the fill report and the "Submitted!" banner, in the widget's ink style. */
export const WIDGET_REPORT_STYLES = `
.progress { margin-top: 12px; }
.bar { height: 10px; border: 1.5px solid var(--ink); overflow: hidden; background: var(--paper); }
.bar i { display: block; height: 100%; width: 0; background: repeating-linear-gradient(-45deg, var(--ink) 0 6px, #444 6px 12px);
  background-size: 17px 17px; animation: march .6s linear infinite; transition: width .45s cubic-bezier(.2,.8,.2,1); }
@keyframes march { to { background-position: 17px 0; } }
.stages { display: flex; justify-content: space-between; gap: 4px; margin: 6px 0 0; padding: 0; list-style: none; font-size: 11px; color: #777; }
.stages li { flex: 1; text-align: center; transition: color .2s ease; }
.stages li.active { color: var(--ink); font-weight: 700; } .stages li.done { color: var(--ink); }
.stages li.done::before { content: "✓ "; }
.report { margin-top: 10px; padding-top: 10px; border-top: 1.5px dashed var(--ink); }
.report-sum { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.chip { padding: 2px 9px; font-size: 11.5px; font-weight: 650; border: 1.3px solid var(--ink); border-radius: 10px 30px 12px 26px / 26px 12px 30px 10px; }
.chip.needs-you { background: var(--ink); color: var(--paper); }
.report-list { max-height: 190px; margin: 0; padding: 0; list-style: none; overflow-y: auto; }
.report-row button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 5px 4px; text-align: left; font-size: 12.5px;
  color: var(--ink); background: none; border: 0; border-bottom: 1px solid rgba(0,0,0,.08); transition: background .12s ease, transform .12s ease; }
.report-row button:hover { background: rgba(0,0,0,.05); transform: translateX(2px); }
.report-row button:active { transform: scale(.98); }
.report-row .mark { flex: none; display: inline-grid; place-items: center; width: 18px; height: 18px; font-size: 11px; font-weight: 800; border: 1.3px solid var(--ink); border-radius: 50%; }
.report-row.needs-you .mark { background: var(--ink); color: var(--paper); }
.report-row.saved .label { color: var(--muted); }
.report-row .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.report-row .req { flex: none; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
.done-banner { margin: 0 0 12px; padding: 12px; text-align: center; border: 1.5px solid var(--ink); background: var(--paper); animation: pop .38s cubic-bezier(.3,1.6,.5,1); }
.done-banner b { display: block; font: 700 26px/1.1 "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive; }
.done-banner p { margin: 4px 0 0; font-size: 12.5px; color: var(--muted); }
@media (prefers-reduced-motion: reduce) { .bar i, .done-banner { animation: none; } .bar i, .report-row button { transition: none; } }`;
