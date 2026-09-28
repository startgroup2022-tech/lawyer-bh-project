import { AboutManagementError } from "./types";

export function assertCompleteAboutOrder(currentIds: string[], requestedIds: string[]) {
  if (currentIds.length !== requestedIds.length) throw new AboutManagementError("incomplete_order");
  const current = new Set(currentIds);
  if (requestedIds.some((id) => !current.has(id)) || new Set(requestedIds).size !== requestedIds.length) {
    throw new AboutManagementError("incomplete_order");
  }
}
