import type { ProviderDashboardView } from "./providerDashboardNavigation";

export function providerDashboardDataNeeds(view: ProviderDashboardView) {
  return {
    requests: view === "requests",
    balances: view === "balances",
  };
}
