import { describe, expect, it } from "vitest";
import {
  isExplicitAddSubmission,
  runExplicitAdd,
} from "./submission-policy";

describe("admin add lawyer submission policy", () => {
  it("allows only the final add button to submit the form", () => {
    expect(isExplicitAddSubmission("implicit")).toBe(false);
    expect(isExplicitAddSubmission("final-add-button")).toBe(true);
  });

  it("invokes the request only for the final add action", async () => {
    let requests = 0;
    const request = async () => {
      requests += 1;
    };

    await runExplicitAdd("implicit", request);
    expect(requests).toBe(0);

    await runExplicitAdd("final-add-button", request);
    expect(requests).toBe(1);
  });
});
