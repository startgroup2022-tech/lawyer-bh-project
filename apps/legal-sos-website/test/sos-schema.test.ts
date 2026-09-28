import { describe, expect, it } from "vitest";
import { sosRequestSchema } from "@/lib/sos-schema";

const valid = {
  country: "BH",
  city: "Manama",
  category: "00000000-0000-4000-8000-000000000001",
  description: "Urgent legal help is needed for an active matter.",
  contactMethod: "phone",
  name: "Test Client",
  phone: "+97336000000",
  phoneDialCode: "973",
  email: "",
  shareLocation: false,
  acceptedTerms: true,
  idempotencyKey: "00000000-0000-4000-8000-000000000002",
};

describe("SOS request validation", () => {
  it("accepts a complete anonymous request", () => {
    expect(sosRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing consent and insufficient contact information", () => {
    expect(sosRequestSchema.safeParse({ ...valid, acceptedTerms: false }).success).toBe(false);
    expect(sosRequestSchema.safeParse({ ...valid, phone: "" }).success).toBe(false);
  });
});
