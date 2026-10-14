import React, { useState } from 'react';

const PREVIEWED_SKILL_COUNT = 4;

/** Your skills, folded to a one-line preview; open to remove chips or add more (comma-separated). */
export default function SkillsEditor({ skills, onChange }: { skills: string[]; onChange: (skills: string[]) => void }) {
  const [newSkillDraft, setNewSkillDraft] = useState('');
  const handleAddSkills = () => {
    const newSkills = newSkillDraft
      .split(',')
      .map((skill) => skill.trim())
      .filter((skill) => skill && !skills.includes(skill));
    if (newSkills.length) onChange([...skills, ...newSkills]);
    setNewSkillDraft('');
  };
  const hiddenSkillCount = skills.length - PREVIEWED_SKILL_COUNT;
  return (
    <details className="sheet flat collapsible-section">
      <summary className="row between">
        <span className="section-title">
          Skills{' '}
          <small>
            {skills.slice(0, PREVIEWED_SKILL_COUNT).join(', ')}
            {hiddenSkillCount > 0 ? ` +${hiddenSkillCount} more` : ''}
          </small>
        </span>
        <span className="small soft">{skills.length}</span>
      </summary>
      <div className="chips">
        {skills.map((skill) => (
          <span className="chip" key={skill}>
            {skill}
            <button
              type="button"
              aria-label={`Remove ${skill}`}
              onClick={() => onChange(skills.filter((existingSkill) => existingSkill !== skill))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="input"
          style={{ width: 140, padding: '3px 2px' }}
          placeholder="+ add skill"
          value={newSkillDraft}
          onChange={(event) => setNewSkillDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAddSkills();
            }
          }}
          onBlur={handleAddSkills}
        />
      </div>
    </details>
  );
}
