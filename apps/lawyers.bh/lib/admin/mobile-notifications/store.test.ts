import { describe, expect, it } from "vitest";
import {
  createMobileNotificationStore,
  type MobileNotificationPersistence,
} from "./store";

const installations = [
  { token: "client-ar", locale: "ar", audienceRole: "client", lawyerStatus: null, lawyerActive: null, isReviewAccount: false },
  { token: "active-en", locale: "en", audienceRole: "lawyer", lawyerStatus: "approved", lawyerActive: true, isReviewAccount: false },
  { token: "review-en", locale: "en", audienceRole: "lawyer", lawyerStatus: "approved", lawyerActive: true, isReviewAccount: true },
  { token: "inactive-en", locale: "en", audienceRole: "lawyer", lawyerStatus: "approved", lawyerActive: false, isReviewAccount: false },
  { token: "pending-tr", locale: "tr", audienceRole: "lawyer", lawyerStatus: "pending", lawyerActive: false, isReviewAccount: false },
  { token: "rejected-ar", locale: "ar", audienceRole: "lawyer", lawyerStatus: "rejected", lawyerActive: false, isReviewAccount: false },
  { token: "client-ar", locale: "ar", audienceRole: "client", lawyerStatus: null, lawyerActive: null, isReviewAccount: false },
] as const;

function persistence(): MobileNotificationPersistence {
  return {
    async installationsFor(filter) {
      return installations
        .filter((item) => {
          if (item.audienceRole === "lawyer" && item.isReviewAccount) return false;
          if (filter === "clients") return item.audienceRole === "client";
          if (filter === "active_lawyers") return item.audienceRole === "lawyer" && item.lawyerStatus === "approved" && item.lawyerActive;
          if (filter === "pending_lawyers") return item.audienceRole === "lawyer" && item.lawyerStatus === "pending";
          if (filter === "all_lawyers") return item.audienceRole === "lawyer";
          return true;
        })
        .map(({ token, locale }) => ({ token, locale }));
    },
    async findSendByIdempotencyKey() { return null; },
    async startSend(input) { return { created: true, record: { ...input, id: "send-1", state: "sending" as const, targeted: 0, successful: 0, failed: 0, pruned: 0, createdAt: new Date(0).toISOString() } }; },
    async finishSend() { throw new Error("not used"); },
    async failSend() { throw new Error("not used"); },
    async recentSends() { return []; },
    async pruneTokens() {},
  };
}

describe("mobile notification audiences", () => {
  it.each([
    ["clients", ["client-ar"]],
    ["active_lawyers", ["active-en"]],
    ["pending_lawyers", ["pending-tr"]],
    ["all_lawyers", ["active-en", "inactive-en", "pending-tr", "rejected-ar"]],
    ["everyone", ["client-ar", "active-en", "inactive-en", "pending-tr", "rejected-ar"]],
  ] as const)("selects and deduplicates %s", async (audience, expected) => {
    const store = createMobileNotificationStore(persistence());
    expect((await store.tokensForAudience(audience)).map((item) => item.token)).toEqual(expected);
    expect(await store.countAudience(audience)).toBe(expected.length);
  });
});
