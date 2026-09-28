type RentalSubmitShape = Record<string, unknown> & {
  id?: string;
  requestId?: string;
  propertyId?: string;
  unitId?: string;
  status?: string;
  resolvedApprovalMode?: string;
};

export function rentalSubmitResponse(
  result: unknown,
  fallback?: { propertyId: string; unitId: string },
) {
  const value = result && typeof result === "object" && !Array.isArray(result)
    ? result as RentalSubmitShape
    : {};
  const requestId = value.requestId ?? value.id;
  return {
    ...value,
    id: requestId,
    requestId,
    propertyId: value.propertyId ?? fallback?.propertyId,
    unitId: value.unitId ?? fallback?.unitId,
    timeline: Array.isArray(value.timeline) ? value.timeline : [],
  };
}
