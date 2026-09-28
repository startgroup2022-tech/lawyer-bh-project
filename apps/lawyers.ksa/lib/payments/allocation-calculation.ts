const SAR_DECIMAL_PLACES = 2;

export type CalculatedPaymentAllocation = {
  grossAmount: number;
  platformPercentage: number;
  providerPercentage: number;
  platformAmount: number;
  providerAmount: number;
};

function roundSar(value: number): number {
  return Number(value.toFixed(SAR_DECIMAL_PLACES));
}

function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Commission percentage is invalid");
  }
  if (value < 0 || value > 100) {
    throw new Error("Commission percentage must be between 0 and 100");
  }
  return Number(value.toFixed(2));
}

export function calculatePaymentAllocation(input: {
  grossAmount: number;
  platformPercentage: number;
  providerPercentage: number;
}): CalculatedPaymentAllocation {
  const grossAmount = roundSar(input.grossAmount);
  const platformPercentage = normalizePercentage(input.platformPercentage);
  const providerPercentage = normalizePercentage(input.providerPercentage);

  if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
    throw new Error("Gross payment amount must be greater than zero");
  }

  if (Math.abs(platformPercentage + providerPercentage - 100) > 0.001) {
    throw new Error("Platform and provider percentages must equal 100");
  }

  const providerAmount = roundSar(
    grossAmount * (providerPercentage / 100),
  );
  const platformAmount = roundSar(grossAmount - providerAmount);

  return {
    grossAmount,
    platformPercentage,
    providerPercentage,
    platformAmount,
    providerAmount,
  };
}

export function calculatePlatformOnlyAllocation(input: {
  grossAmount: number;
}): CalculatedPaymentAllocation {
  return calculatePaymentAllocation({
    grossAmount: input.grossAmount,
    platformPercentage: 100,
    providerPercentage: 0,
  });
}
