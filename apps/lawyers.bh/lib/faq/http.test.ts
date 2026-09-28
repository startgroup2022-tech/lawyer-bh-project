import { describe, expect, it } from "vitest";
import { faqErrorResponse } from "./http";

describe("FAQ HTTP errors", () => {
  it("maps duplicate keys to a stable conflict", async () => {
    const response = faqErrorResponse(new Error("duplicate key value violates unique constraint"));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "duplicate_key" });
  });

  it("does not expose unexpected database messages", async () => {
    const response = faqErrorResponse(new Error("password=secret"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "internal_error" });
  });
});
