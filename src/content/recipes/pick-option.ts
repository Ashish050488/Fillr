export interface OptionCandidate<OptionType> {
  option: OptionType;
  /** Lower-cased visible text. */
  text: string;
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/** The suggestion naming your city, preferring one that also names your state or country. */
export function pickCityOption<OptionType>(
  options: Array<OptionCandidate<OptionType>>,
  location: string,
): OptionType | undefined {
  const [city = '', ...rest] = location.split(',').map(normalize);
  if (!city) return undefined;
  const candidates = options.filter(({ text }) => text.includes(city));
  const score = (text: string) =>
    rest.filter((part) => part && text.includes(part)).length + (text.startsWith(city) ? 0.5 : 0);
  return [...candidates].sort((first, second) => score(second.text) - score(first.text))[0]?.option;
}

/** An exact match, then one starting with the value ("India +91"), then one containing it. */
export function pickNamedOption<OptionType>(
  options: Array<OptionCandidate<OptionType>>,
  value: string,
): OptionType | undefined {
  const wanted = normalize(value);
  if (!wanted) return undefined;
  return (
    options.find(({ text }) => text === wanted) ??
    options.find(({ text }) => text.startsWith(wanted)) ??
    options.find(({ text }) => text.includes(wanted))
  )?.option;
}
