import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingRequests, emergencyRequests } from "@/lib/db/schema";

describe("request client account ownership schema", () => {
  it("exposes nullable client account ownership on emergency requests", () => {
    const column = getTableColumns(emergencyRequests).clientAccountId;

    expect(column.name).toBe("client_account_id");
    expect(column.notNull).toBe(false);
  });

  it("exposes nullable client account ownership on booking requests", () => {
    const column = getTableColumns(bookingRequests).clientAccountId;

    expect(column.name).toBe("client_account_id");
    expect(column.notNull).toBe(false);
  });
});
