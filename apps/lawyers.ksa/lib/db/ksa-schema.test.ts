import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advocateShifts,
  bookingRequests,
  bookingReviews,
  consentLog,
  consultationMethods,
  emergencyCaseTypes,
  emergencyRequests,
  lawyerAgreements,
  lawyerLegalCases,
  lawyerPushSubscriptions,
  legalCaseCategories,
  legalCases,
  paymentAllocations,
  providerCommissionRates,
  saudiLawyers,
  tapRetailerOnboarding,
} from "./schema";

describe("Lawyers KSA runtime schema", () => {
  it.each([
    ["saudi_consent_log", consentLog],
    ["saudi_lawyers", saudiLawyers],
    ["saudi_advocate_shifts", advocateShifts],
    ["saudi_lawyer_push_subscriptions", lawyerPushSubscriptions],
    ["saudi_emergency_case_types", emergencyCaseTypes],
    ["saudi_consultation_methods", consultationMethods],
    ["saudi_emergency_requests", emergencyRequests],
    ["saudi_lawyer_agreements", lawyerAgreements],
    ["saudi_legal_case_categories", legalCaseCategories],
    ["saudi_legal_cases", legalCases],
    ["saudi_lawyer_legal_cases", lawyerLegalCases],
    ["saudi_booking_requests", bookingRequests],
    ["saudi_booking_reviews", bookingReviews],
    ["saudi_provider_commission_rates", providerCommissionRates],
    ["saudi_payment_allocations", paymentAllocations],
    ["saudi_tap_retailer_onboarding", tapRetailerOnboarding],
  ])("maps runtime operations to %s", (expectedName, table) => {
    expect(getTableName(table)).toBe(expectedName);
  });
});
