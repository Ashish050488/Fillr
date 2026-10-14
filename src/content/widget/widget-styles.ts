/** The in-page widget's look: black ink on white, hand-drawn edges (inside its own shadow root). */
export const WIDGET_STYLES = `
:host { all: initial; }
* { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.wrap { --paper: #ffffff; --ink: #000000; --muted: #222222; --logo-paper: var(--paper);
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
.r1 { border-radius: 255px 12px 225px 12px / 12px 225px 12px 255px; } .r2 { border-radius: 12px 225px 12px 255px / 255px 12px 225px 12px; }
.fab { display: flex; align-items: stretch; height: 42px; color: var(--ink); background: var(--paper); border: 1.5px solid var(--ink); box-shadow: 3px 3px 0 var(--ink); overflow: hidden; }
.fab button { display: flex; align-items: center; gap: 7px; border: 0; background: none; color: var(--ink); cursor: pointer; font-size: 13.5px; font-weight: 650; transition: background .12s ease; }
.fab button:hover:not(:disabled) { background: rgba(0,0,0,.06); } .fab button:disabled { cursor: progress; }
.quick { padding: 0 12px 0 8px; } .more { gap: 5px; padding: 0 10px; border-left: 1.5px solid var(--ink) !important; }
.chev { width: 11px; height: 8px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
.fab.done .quick { font-weight: 600; }
.fab .logo, .head .logo { display: inline-flex; width: 26px; height: 26px; color: var(--ink); } .logo svg { width: 100%; height: 100%; }
.score { padding: 1px 7px; border: 1.2px solid var(--ink); font-size: 11.5px; border-radius: 10px 30px 12px 26px / 26px 12px 30px 10px; }
.card { width: min(360px, calc(100vw - 40px)); max-height: calc(100vh - 110px); overflow-y: auto; overscroll-behavior: contain; padding: 16px; color: var(--ink); background: var(--paper); border: 1.5px solid var(--ink); box-shadow: 4px 4px 0 var(--ink);
  font-size: 13px; line-height: 1.5; animation: in .18s ease-out; }
@keyframes in { from { opacity: 0; transform: translateY(6px); } }
.head { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; }
.head b { font: 700 24px/1 "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive; }
.x { margin-left: auto; width: 28px; height: 28px; border: 0; background: none; color: var(--muted); cursor: pointer; font-size: 18px; }
.fit { margin: 0 0 12px; padding: 8px 10px; border: 1.5px dashed var(--ink); }
.fit strong { font-size: 15px; } .fit p { margin: 2px 0 0; color: var(--muted); font-size: 12px; }
.btn { width: 100%; min-height: 40px; margin-top: 8px; cursor: pointer; font-size: 13.5px; font-weight: 650; color: var(--ink); background: var(--paper);
  border: 1.5px solid var(--ink); box-shadow: 2px 2px 0 var(--ink); transition: transform .12s ease, box-shadow .12s ease; }
.btn:hover:not(:disabled) { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--ink); }
.btn:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: none; }
.btn.primary { background: var(--ink); color: var(--paper); } .btn:disabled { opacity: .55; cursor: progress; }
.step-note { margin: 8px 0 0; padding: 6px 8px; border: 1.5px dashed var(--ink); font-size: 12px; }
.link { display: block; margin: 10px auto 0; border: 0; background: none; color: var(--muted); cursor: pointer; text-decoration: underline wavy; text-underline-offset: 4px; font-size: 12px; }
.state { margin: 10px 0 0; color: var(--ink); } .state.err { padding-left: 8px; border-left: 3px double var(--ink); }
.spin { display: inline-block; width: 12px; height: 12px; margin-right: 6px; border: 2px solid var(--ink); border-right-color: transparent; border-radius: 50%; animation: s .8s linear infinite; vertical-align: -2px; }
@keyframes s { to { transform: rotate(360deg); } }
details { margin-top: 8px; color: var(--muted); font-size: 12px; } summary { cursor: pointer; } ul { max-height: 110px; overflow: auto; margin: 6px 0 0; padding-left: 18px; }
.ask { margin-top: 12px; padding-top: 10px; border-top: 1.5px dashed var(--ink); }
.ask-heading { margin: 0; font-weight: 700; font-size: 14px; } .ask-note { margin: 2px 0 8px; color: var(--muted); font-size: 12px; }
.ask-row { padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,.12); } .ask-row:last-child { border-bottom: 0; } .ask-row.busy { opacity: .5; pointer-events: none; }
.ask-question { margin: 0 0 6px; font-size: 12.5px; line-height: 1.45; cursor: pointer; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.ask-question.expanded { display: block; }
.ask-options, .ask-text { display: flex; flex-wrap: wrap; gap: 6px; }
.ask-option { min-height: 30px; padding: 4px 12px; cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--ink); background: var(--paper); border: 1.5px solid var(--ink); transition: background .12s ease, color .12s ease; }
.ask-option:hover { background: var(--ink); color: var(--paper); } .ask-option.failed, .ask-input.failed { border-style: dashed; }
.ask-input { flex: 1; min-width: 0; padding: 5px 2px; font-size: 12.5px; color: var(--ink); background: transparent; border: 0; border-bottom: 1.5px solid var(--ink); }
.ask-input:focus { outline: none; border-bottom-width: 2px; }
button:focus-visible { outline: 2px dashed var(--ink); outline-offset: 3px; }
[hidden] { display: none !important; }
@media (prefers-reduced-motion: reduce) { .card, .spin { animation: none; } .fab, .btn { transition: none; } }`;
