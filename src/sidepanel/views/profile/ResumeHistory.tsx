import React from 'react';
import type { Profile } from '../../../shared/types';
import { splitIntoPoints } from './description-points';

const PREVIEWED_POINT_COUNT = 2;

type ResumeEntry = Record<string, unknown>;
const readText = (entryField: unknown) => (typeof entryField === 'string' ? entryField.trim() : '');
const formatDates = (entry: ResumeEntry) =>
  [readText(entry.startDate), readText(entry.endDate)].filter(Boolean).join(' – ');

/** One entry: heading, dates, and the full description read from your resume (click to expand). */
function ResumeEntryItem({ heading, meta, description }: { heading: string; meta: string; description: string }) {
  const points = description ? splitIntoPoints(description) : [];
  const hiddenPoints = points.slice(PREVIEWED_POINT_COUNT);
  return (
    <div className="item resume-entry">
      <div className="resume-entry-text">
        <h4>{heading}</h4>
        {meta && <p className="meta">{meta}</p>}
        {points.length > 0 && (
          <ul className="resume-points">
            {points.slice(0, PREVIEWED_POINT_COUNT).map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}
        {hiddenPoints.length > 0 && (
          <details className="resume-entry-description">
            <summary>
              {hiddenPoints.length} more point{hiddenPoints.length === 1 ? '' : 's'}
            </summary>
            <ul className="resume-points">
              {hiddenPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * What was read from your resume: jobs with their descriptions, education and projects. This is
 * what the AI uses to write your answers, and what fills Workday's "Role Description" boxes.
 */
export default function ResumeHistory({ profile }: { profile: Profile }) {
  const experience = profile.workExperience as ResumeEntry[];
  const education = profile.education as ResumeEntry[];
  const projects = profile.projects as ResumeEntry[];
  const entryCount = experience.length + education.length + projects.length;
  if (!entryCount) return null;
  return (
    <details className="sheet flat collapsible-section">
      <summary className="row between">
        <span className="section-title">
          From your resume <small>used to write your answers</small>
        </span>
        <span className="small soft">{entryCount}</span>
      </summary>
      <div className="list">
        {experience.map((entry, entryIndex) => (
          <ResumeEntryItem
            key={`experience-${entryIndex}`}
            heading={[readText(entry.title) || 'Role', readText(entry.company)].filter(Boolean).join(' · ')}
            meta={[formatDates(entry), readText(entry.location)].filter(Boolean).join(' · ')}
            description={readText(entry.description)}
          />
        ))}
        {education.map((entry, entryIndex) => (
          <ResumeEntryItem
            key={`education-${entryIndex}`}
            heading={[readText(entry.degree) || 'Study', readText(entry.field)].filter(Boolean).join(', ')}
            meta={[readText(entry.institution), formatDates(entry)].filter(Boolean).join(' · ')}
            description={readText(entry.details)}
          />
        ))}
        {projects.map((entry, entryIndex) => (
          <ResumeEntryItem
            key={`project-${entryIndex}`}
            heading={readText(entry.name) || 'Project'}
            meta={Array.isArray(entry.technologies) ? entry.technologies.join(', ') : ''}
            description={readText(entry.description)}
          />
        ))}
      </div>
    </details>
  );
}
