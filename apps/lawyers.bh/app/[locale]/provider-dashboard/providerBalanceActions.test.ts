import { describe, expect, it } from "vitest";
import { providerBalanceDocumentActions } from "./providerBalanceActions";

describe("providerBalanceDocumentActions", () => {
  it("always exposes the invoice", () => {
    expect(providerBalanceDocumentActions("draft", null)).toEqual({ invoice: true, receipt: false });
  });

  it("exposes the receipt only after a captured payment", () => {
    expect(providerBalanceDocumentActions("paid", "CAPTURED")).toEqual({ invoice: true, receipt: true });
    expect(providerBalanceDocumentActions("paid", "FAILED")).toEqual({ invoice: true, receipt: false });
    expect(providerBalanceDocumentActions("pending_payment", "CAPTURED")).toEqual({ invoice: true, receipt: false });
  });
});
