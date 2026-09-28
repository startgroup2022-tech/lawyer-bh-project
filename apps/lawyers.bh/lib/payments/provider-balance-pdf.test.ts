import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderProviderBalancePdf } from "./provider-balance-pdf";

const balance = {
  publicReference: "BAL-ABC12345",
  providerNameAr: "المحامي حبيب",
  providerNameEn: "Habib Mohammed",
  customerName: "Ali Customer",
  description: "Legal consultation",
  amount: "12.000",
  currencyCode: "BHD",
  dueDate: "2026-09-10",
  status: "paid",
  paidAt: new Date("2026-09-06T10:00:00Z"),
};

describe("provider balance PDF", () => {
  it.each([
    ["invoice", "ar", "Lawyers.bh Invoice BAL-ABC12345"],
    ["receipt", "en", "Lawyers.bh Receipt BAL-ABC12345"],
  ] as const)("renders a valid %s PDF in %s", async (kind, locale, title) => {
    const bytes = await renderProviderBalancePdf({ kind, locale, balance });
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
    const document = await PDFDocument.load(bytes);
    expect(document.getTitle()).toBe(title);
    expect(document.getPageCount()).toBe(1);
  });
});
