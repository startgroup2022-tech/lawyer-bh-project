import { describe, expect, it, vi } from "vitest";

import { scrollToLegalTool } from "./scrollToLegalTool";

describe("scrollToLegalTool", () => {
  it("scrolls the rendered tool to its start smoothly", () => {
    const scrollIntoView = vi.fn();

    scrollToLegalTool({ scrollIntoView }, false, (callback) => callback(0));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("uses immediate scrolling when reduced motion is preferred", () => {
    const scrollIntoView = vi.fn();

    scrollToLegalTool({ scrollIntoView }, true, (callback) => callback(0));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
  });
});
