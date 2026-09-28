import { describe, expect, it } from "vitest";

import { SHOW_PUBLIC_PROVIDER_CARDS } from "./public-ui-features";

describe("public UI feature flags", () => {
  it("shows approved public provider cards", () => {
    expect(SHOW_PUBLIC_PROVIDER_CARDS).toBe(true);
  });
});
