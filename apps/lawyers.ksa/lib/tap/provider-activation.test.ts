import { describe, expect, it, vi } from "vitest";

import { parseTapProviderNotification, syncTapProviderActivation } from "./provider-activation";

describe("syncTapProviderActivation", () => {
  it("uses Tap's authenticated destination state instead of trusting the notification payout flag", async () => {
    const applyConfirmedStatus = vi.fn(async (input) => ({ lawyerId: "law_1", ...input }));
    const retrieveDestination = vi.fn(async () => ({ id: "68025843", status: "Inactive" }));

    const result = await syncTapProviderActivation(
      { environment: "test", tapClient: { retrieveDestination }, repository: { applyConfirmedStatus } },
      { retailerId: "68025843", destinationId: "68025843", payoutEnabled: true },
    );

    expect(retrieveDestination).toHaveBeenCalledWith("68025843");
    expect(applyConfirmedStatus).toHaveBeenCalledWith({
      retailerId: "68025843",
      destinationId: "68025843",
      environment: "test",
      payoutEnabled: false,
    });
    expect(result.payoutEnabled).toBe(false);
  });

  it("activates only when Tap confirms an active destination", async () => {
    const applyConfirmedStatus = vi.fn(async (input) => ({ lawyerId: "law_1", ...input }));

    await syncTapProviderActivation(
      {
        environment: "live",
        tapClient: { retrieveDestination: async () => ({ id: "68025843", status: "Active" }) },
        repository: { applyConfirmedStatus },
      },
      { retailerId: "68025843", destinationId: "68025843" },
    );

    expect(applyConfirmedStatus).toHaveBeenCalledWith(expect.objectContaining({
      environment: "live",
      payoutEnabled: true,
    }));
  });

  it("rejects notifications without a persisted Tap identifier", async () => {
    await expect(syncTapProviderActivation(
      {
        environment: "test",
        tapClient: { retrieveDestination: async () => ({ id: "unused", status: "Active" }) },
        repository: { applyConfirmedStatus: async () => null },
      },
      {},
    )).rejects.toThrow("Tap retailer identifier is missing");
  });
});

describe("parseTapProviderNotification", () => {
  it("extracts the retailer identifier from Tap's nested account payload", () => {
    expect(parseTapProviderNotification({
      retailer: { id: "68025843", status: { payout: true } },
    })).toEqual({
      retailerId: "68025843",
      destinationId: "68025843",
      payoutEnabled: true,
    });
  });

  it("rejects malformed bodies", () => {
    expect(() => parseTapProviderNotification({ retailer: { id: "" } })).toThrow(
      "Tap retailer identifier is missing",
    );
  });
});
