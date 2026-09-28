import { describe, expect, it } from "vitest";
import { ADMIN_CARD, ADMIN_INPUT, ADMIN_INTERACTIVE_CARD, ADMIN_PAGE } from "./admin-shell-styles";

describe("admin shell styles", () => {
  it("uses the approved page background and responsive spacing", () => {
    expect(ADMIN_PAGE).toContain("bg-[#F7F8FA]");
    expect(ADMIN_PAGE).toContain("px-5");
  });

  it("keeps cards borderless until red hover or focus", () => {
    expect(ADMIN_CARD).toContain("border-transparent");
    expect(ADMIN_INTERACTIVE_CARD).toContain("hover:border-[#B4232A]");
    expect(ADMIN_INTERACTIVE_CARD).toContain("focus-within:border-[#B4232A]");
  });

  it("uses the Admins and Permissions input focus treatment", () => {
    expect(ADMIN_INPUT).toContain("focus:border-[#B4232A]");
    expect(ADMIN_INPUT).toContain("focus:ring-4");
  });
});
