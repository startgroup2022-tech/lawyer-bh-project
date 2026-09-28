import { describe, expect, it } from "vitest";
import { evaluateDiscount, type DiscountRecord } from "./service";
import { parseDiscountPayload } from "./admin-validation";

const code: DiscountRecord = { id: "test", code: "SAVE20", discountType: "percentage", discountValue: "20", isActive: true, startsAt: null, endsAt: null, totalUsageLimit: null, perUserUsageLimit: null };
const input = { originalFils: 12345, totalUsed: 0, userUsed: 0, now: new Date() };
describe("discount channels", () => {
  it.each([["website", "app"], ["app", "website"]] as const)("rejects %s codes on %s", (scope, channel) => {
    expect(() => evaluateDiscount({ ...input, code: { ...code, scope }, channel })).toThrow("wrong_channel");
  });
  it.each(["website", "app"] as const)("allows both on %s with exact fils", (channel) => {
    expect(evaluateDiscount({ ...input, code: { ...code, scope: "both" }, channel })).toMatchObject({ originalAmountBd: "12.345", discountAmountBd: "2.469", finalAmountBd: "9.876" });
  });
  it("does not expose legacy website codes to the app", () => {
    expect(() => evaluateDiscount({ ...input, code, channel: "app" })).toThrow("wrong_channel");
  });
  it.each(["website", "app", "both"])("persists admin scope %s", (scope) => {
    expect(parseDiscountPayload({ code: "SAVE20", discountType: "percentage", discountValue: "20", scope })).toMatchObject({ scope });
  });
  it("defaults existing forms to website", () => {
    expect(parseDiscountPayload({ code: "SAVE20", discountType: "fixed", discountValue: "2" })).toMatchObject({ scope: "website" });
  });
  it("rejects unknown scopes", () => {
    expect(() => parseDiscountPayload({ code: "SAVE20", discountType: "fixed", discountValue: "2", scope: "anywhere" })).toThrow("invalid_scope");
  });
});
