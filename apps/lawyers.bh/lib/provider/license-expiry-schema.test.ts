import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { lawyerLicenseNotifications } from "@/lib/db/schema";

describe("lawyer license notification schema", () => {
  it("stores one delivery state per lawyer, expiry date, and reminder kind", () => {
    expect(getTableName(lawyerLicenseNotifications)).toBe(
      "lawyer_license_notifications",
    );
    expect(Object.keys(getTableColumns(lawyerLicenseNotifications))).toEqual([
      "id",
      "lawyerId",
      "licenseExpiryDate",
      "reminderKind",
      "attemptCount",
      "lastError",
      "claimedAt",
      "sentAt",
      "createdAt",
      "updatedAt",
    ]);
  });
});
