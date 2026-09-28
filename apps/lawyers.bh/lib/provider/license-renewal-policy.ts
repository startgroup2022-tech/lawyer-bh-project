export type ProviderLicenseRenewalInput = {
  status: string | null;
  suspensionType: string | null;
  licenseExpiryDate: string | null;
  today?: string;
};

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: string | null | undefined) {
  if (!value || !calendarDatePattern.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function utcCalendarDate() {
  return new Date().toISOString().slice(0, 10);
}

export function canRenewProviderLicense(input: ProviderLicenseRenewalInput) {
  const status = String(input.status ?? "pending").trim().toLowerCase();
  const suspensionType = String(input.suspensionType ?? "")
    .trim()
    .toLowerCase();

  const statusAllowsRenewal =
    status === "approved" ||
    (status === "suspended" && suspensionType === "license_expired");

  if (!statusAllowsRenewal) return false;
  if (!isValidCalendarDate(input.licenseExpiryDate)) return true;

  return input.licenseExpiryDate! <= (input.today ?? utcCalendarDate());
}
