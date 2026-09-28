import { describe, expect, it } from "vitest";

import { mapEmergencyCaseRow } from "./emergencyCaseProjection";

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "emergency_consultation",
  name_ar: "استشارة قانونية",
  name_en: "Legal consultation",
  description_ar: "وصف",
  description_en: "Description",
  action_type_ar: "محادثة واتصال",
  action_type_en: "Chat and call",
  price: "15.000",
  currency_code: "BHD",
  icon_key: "warning",
  icon_asset_url: "https://cdn.example.com/sos-case-icons/icon.svg",
  workflow_type: "direct_consultation",
  sort_order: 4,
};

describe("emergency case catalogue projection", () => {
  it("projects workflow and custom icon metadata", () => {
    expect(mapEmergencyCaseRow(row)).toMatchObject({
      workflowType: "direct_consultation",
      iconUrl: "https://cdn.example.com/sos-case-icons/icon.svg",
    });
  });

  it("falls back safely for an existing catalogue row", () => {
    expect(
      mapEmergencyCaseRow({
        ...row,
        workflow_type: null,
        icon_asset_url: " ",
      }),
    ).toMatchObject({ workflowType: "emergency_dispatch", iconUrl: null });
  });
});
