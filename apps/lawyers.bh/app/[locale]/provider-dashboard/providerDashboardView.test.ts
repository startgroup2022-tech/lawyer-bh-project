import { describe, expect, it } from "vitest";
import { providerDashboardDataNeeds } from "./providerDashboardView";

describe("providerDashboardDataNeeds", () => {
  it.each([
    ["home", { requests: false, balances: false }],
    ["requests", { requests: true, balances: false }],
    ["balances", { requests: false, balances: true }],
    ["profile", { requests: false, balances: false }],
  ] as const)("isolates %s data loading", (view, expected) => {
    expect(providerDashboardDataNeeds(view)).toEqual(expected);
  });
});
