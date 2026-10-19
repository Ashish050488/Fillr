import type { FillReportRow, FillStage } from '../fill/fill-report';
import type { WidgetElements } from './widget-markup';

const STAGE_ORDER: FillStage[] = ['reading', 'details', 'answers', 'checking'];
const STAGE_PERCENT: Record<FillStage, number> = { reading: 12, details: 40, answers: 70, checking: 92 };
const STATUS_MARK: Record<FillReportRow['status'], string> = { saved: '✓', ai: '✦', 'needs-you': '!' };
const STATUS_TITLE: Record<FillReportRow['status'], string> = {
  saved: 'From your saved details',
  ai: 'Written for this job',
  'needs-you': 'Needs you',
};
const FLASH_MILLISECONDS = 1600;

/** The four-stage bar shown while a fill runs; returns the percent for the launcher label. */
export function showFillStage(elements: WidgetElements, stage: FillStage): number {
  const percent = STAGE_PERCENT[stage];
  elements.progress.hidden = false;
  elements.report.hidden = true;
  elements.progressBar.style.width = `${percent}%`;
  const activeIndex = STAGE_ORDER.indexOf(stage);
  Array.from(elements.stages.children).forEach((stageItem, stageIndex) => {
    stageItem.className = stageIndex < activeIndex ? 'done' : stageIndex === activeIndex ? 'active' : '';
  });
  return percent;
}

export function finishFillProgress(elements: WidgetElements): void {
  elements.progressBar.style.width = '100%';
  Array.from(elements.stages.children).forEach((stageItem) => (stageItem.className = 'done'));
  window.setTimeout(() => (elements.progress.hidden = true), 700);
}

/** Bring a field into view and outline it, so you can see exactly what to check. */
function revealField(element: Element): void {
  const field = element as HTMLElement;
  const target = field.getClientRects().length ? field : ((field.closest('label, div') as HTMLElement | null) ?? field);
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (field.getClientRects().length) field.focus({ preventScroll: true });
  const previousOutline = target.style.outline;
  target.style.outline = '3px dashed #000';
  target.style.outlineOffset = '3px';
  window.setTimeout(() => (target.style.outline = previousOutline), FLASH_MILLISECONDS);
}

function buildRow(row: FillReportRow): HTMLLIElement {
  const listItem = document.createElement('li');
  listItem.className = `report-row ${row.status}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.title = `${STATUS_TITLE[row.status]}. Click to show it on the page.`;
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.textContent = STATUS_MARK[row.status];
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = row.label;
  button.append(mark, label);
  if (row.isRequired && row.status === 'needs-you') {
    const required = document.createElement('span');
    required.className = 'req';
    required.textContent = 'required';
    button.append(required);
  }
  button.addEventListener('click', () => revealField(row.element));
  listItem.append(button);
  return listItem;
}

/** "8 filled · 2 written for this job · 1 needs you", then one clickable row per field. */
export function renderFillReport(elements: WidgetElements, rows: FillReportRow[]): void {
  elements.report.hidden = rows.length === 0;
  if (!rows.length) return;
  const count = (status: FillReportRow['status']) => rows.filter((row) => row.status === status).length;
  const summary = document.createElement('div');
  summary.className = 'report-sum';
  const chips: Array<[FillReportRow['status'], string]> = [
    ['saved', `${count('saved')} filled`],
    ['ai', `${count('ai')} written for this job`],
    ['needs-you', `${count('needs-you')} need you`],
  ];
  summary.append(
    ...chips
      .filter(([status]) => count(status) > 0)
      .map(([status, text]) => {
        const chip = document.createElement('span');
        chip.className = `chip ${status}`;
        chip.textContent = `${STATUS_MARK[status]} ${text}`;
        return chip;
      }),
  );
  const list = document.createElement('ul');
  list.className = 'report-list';
  list.append(...rows.map(buildRow));
  elements.report.replaceChildren(summary, list);
}
