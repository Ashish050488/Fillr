/** Profile fields that come straight from the parsed resume lists, shared by the panel and the form filler. */
type Entry = Record<string, unknown>;
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Current role and education from the parsed resume lists, so those fields never need retyping. */
export function derivedFields(profile: { workExperience: unknown[]; education: unknown[] }): Record<string, string> {
  const jobs = profile.workExperience as Entry[];
  const current = jobs.find((job) => /present|current|now/i.test(text(job.endDate))) ?? jobs[0];
  const studies = profile.education as Entry[];
  const latest = [...studies].sort(
    (left, right) =>
      Number(text(right.endDate).match(/\d{4}/)?.[0] ?? 0) - Number(text(left.endDate).match(/\d{4}/)?.[0] ?? 0),
  )[0];
  const gpa =
    text(latest?.details).match(/(?:c?gpa|cgpa|grade|percentage|score)[:\s]*([\d.]+\s*(?:\/\s*\d+|%)?)/i)?.[1] ??
    text(latest?.details).match(/\b(\d{1,2}\.\d{1,2})\s*\/\s*10\b/)?.[0];
  return {
    currentTitle: text(current?.title),
    currentCompany: text(current?.company),
    university: text(latest?.institution),
    degree: text(latest?.degree),
    fieldOfStudy: text(latest?.field),
    graduationYear: text(latest?.endDate).match(/\b(19|20)\d{2}\b/)?.[0] ?? '',
    gpa: gpa ?? '',
  };
}
