const CIRCLE_POINTS = 48;

/** A circle drawn by hand: slightly uneven radius, with the pen overlapping where it started. */
export function drawRoughCirclePath(centerX: number, centerY: number, radius: number, wobbleSeed = 1): string {
  const points: string[] = [];
  for (let pointIndex = 0; pointIndex <= CIRCLE_POINTS + 3; pointIndex += 1) {
    const angle = (pointIndex / CIRCLE_POINTS) * Math.PI * 2 - Math.PI / 2 + 0.05;
    const overlap = pointIndex > CIRCLE_POINTS ? 1.6 : 0;
    const wobble = Math.sin(angle * 3 + wobbleSeed) * 1.4 + Math.cos(angle * 5 + wobbleSeed * 2) * 0.8 + overlap;
    const pointX = (centerX + Math.cos(angle) * (radius + wobble)).toFixed(2);
    const pointY = (centerY + Math.sin(angle) * (radius + wobble)).toFixed(2);
    points.push(`${pointX} ${pointY}`);
  }
  return `M${points.join(' L')}`;
}
