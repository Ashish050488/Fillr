import { afterEach, describe, expect, it, vi } from 'vitest';
import { readYc, readYcPageProps } from './yc-reader';

const pageData = {
  component: 'WaasShowJobPage',
  props: {
    company: { name: 'Eventual', batch_name: 'W22', one_liner: 'AI data engine' },
    job: { title: 'Research Engineer', description: 'Build pipelines & tools.' },
  },
};
const encodedPage = `<div id="app" data-page="${JSON.stringify(pageData).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></div>`;

afterEach(() => vi.unstubAllGlobals());

describe('readYc', () => {
  it('reads the page data embedded in the HTML', () => {
    expect(readYcPageProps(encodedPage)).toEqual(pageData.props);
    expect(readYcPageProps('<html></html>')).toBeUndefined();
  });

  it('turns a YC job page into a posting with the full brief', async () => {
    const fetchPage = vi.fn(async (_requestUrl: string) => new Response(encodedPage, { status: 200 }));
    vi.stubGlobal('fetch', fetchPage);
    const atsJob = await readYc(new URL('https://www.ycombinator.com/companies/eventual/jobs/AeLBWI3-research?x=1'));
    expect(fetchPage.mock.calls[0][0]).toBe('https://www.ycombinator.com/companies/eventual/jobs/AeLBWI3-research');
    expect(atsJob).toMatchObject({ ats: 'Y Combinator', title: 'Research Engineer', company: 'Eventual' });
    expect(atsJob?.description).toContain('Build pipelines & tools.');
  });

  it('leaves other pages alone', () => {
    expect(readYc(new URL('https://www.ycombinator.com/companies/eventual'))).toBeUndefined();
    expect(readYc(new URL('https://jobs.lever.co/acme/1'))).toBeUndefined();
  });
});
