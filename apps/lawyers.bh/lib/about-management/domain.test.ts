import { describe, expect, it } from "vitest";
import { assertCompleteAboutOrder } from "./domain";

describe("About management ordering", () => {
  it("accepts the complete set in a new order", () => {
    expect(() => assertCompleteAboutOrder(["a", "b"], ["b", "a"])).not.toThrow();
  });
  it("rejects missing or foreign records", () => {
    expect(() => assertCompleteAboutOrder(["a", "b"], ["a"])).toThrowError("incomplete_order");
    expect(() => assertCompleteAboutOrder(["a"], ["x"])).toThrowError("incomplete_order");
  });
});
