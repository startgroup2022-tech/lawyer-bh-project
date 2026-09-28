import { describe, expect, it } from "vitest";
import { PRIVATE_ROUTE_PREFIXES, privatePageRobots } from "./indexing-policy";

describe("SEO indexing policy", () => {
  it("blocks private and transactional route families", () => {
    expect(PRIVATE_ROUTE_PREFIXES).toContain("/ar/payment");
    expect(PRIVATE_ROUTE_PREFIXES).toContain("/en/provider-dashboard");
    expect(PRIVATE_ROUTE_PREFIXES).toContain("/api/");
  });
  it("provides strict private page metadata", () => {
    expect(privatePageRobots).toEqual({ index: false, follow: false, nocache: true });
  });
});
