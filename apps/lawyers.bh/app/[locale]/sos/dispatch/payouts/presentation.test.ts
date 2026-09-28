import { describe, expect, it } from "vitest";
import { formatBhd, settlementStatusLabel } from "./presentation";

describe("payable presentation", () => {
  it("formats BHD with three decimals", () => expect(formatBhd(8)).toBe("8.000 BHD"));
  it("localizes settlement states", () => {
    expect(settlementStatusLabel("bank_pending", "ar")).toBe("بانتظار التحويل");
    expect(settlementStatusLabel("paid_bank", "en")).toBe("Paid by bank");
  });
});
