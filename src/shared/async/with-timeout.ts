/** Settle with `work`, or reject with `timeoutMessage` once `timeoutMilliseconds` pass. */
export function withTimeout<Outcome>(
  work: Promise<Outcome>,
  timeoutMilliseconds: number,
  timeoutMessage: string,
): Promise<Outcome> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMilliseconds);
  });
  return Promise.race([work, expiry]).finally(() => clearTimeout(timeout));
}
