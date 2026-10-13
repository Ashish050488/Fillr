import { describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "./constants";

describe("legacy storage compatibility", () => {
  it("preserves the legacy job and lifetime keys", () => {
    expect(STORAGE_KEYS.JOBS_STORAGE).toBe("jobfill_jobs_v1");
    expect(STORAGE_KEYS.LIFETIME_METRICS).toBe("jobfill_lifetime_metrics_v1");
    expect(STORAGE_KEYS.USER_PROFILES).toBe("jobfill_profiles");
  });
});
