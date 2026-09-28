import { describe, expect, it, vi } from "vitest";

import { createReviewLawyerAccount } from "./create-review-lawyer.mjs";

type ReviewLawyerInput = {
  email: string;
  password: string;
  registrationNo: string;
  membershipNo: string;
  phone: string;
  fullNameAr: string;
  fullNameEn: string;
};

type TransactionTools = {
  countEmailMatches: (email: string) => Promise<number>;
  countRegistrationNoMatches: (registrationNo: string) => Promise<number>;
  countPhoneMatches: (phone: string) => Promise<number>;
  countMembershipNoMatches: (membershipNo: string) => Promise<number>;
  countReviewAccounts: () => Promise<number>;
  insertReviewLawyer: (input: Record<string, unknown>) => Promise<number>;
};

type TransactionOperation = (tools: TransactionTools) => Promise<void>;

const input: ReviewLawyerInput = {
  email: "  Habib20298@GMAIL.com ",
  password: "temporary-secret",
  registrationNo: "APP-REVIEW-001",
  membershipNo: "MEMBER-APP-REVIEW-001",
  phone: "+97300000000",
  fullNameAr: "حساب مراجعة التطبيق",
  fullNameEn: "App Review Lawyer",
};

describe("review lawyer account creation", () => {
  it("atomically creates the minimum isolated account when no email or review account exists", async () => {
    const hash = vi.fn(async () => "hashed-password");
    const countEmailMatches = vi.fn(async () => 0);
    const countRegistrationNoMatches = vi.fn(async () => 0);
    const countPhoneMatches = vi.fn(async () => 0);
    const countMembershipNoMatches = vi.fn(async () => 0);
    const countReviewAccounts = vi.fn(async () => 0);
    const insertReviewLawyer = vi.fn(async () => 1);
    const log = vi.fn();

    await createReviewLawyerAccount({
      ...input,
      hash,
      transaction: async (operation: TransactionOperation) => operation({
        countEmailMatches,
        countRegistrationNoMatches,
        countPhoneMatches,
        countMembershipNoMatches,
        countReviewAccounts,
        insertReviewLawyer,
      }),
      log,
    });

    expect(hash).toHaveBeenCalledWith("temporary-secret", 12);
    expect(countEmailMatches).toHaveBeenCalledWith("habib20298@gmail.com");
    expect(countRegistrationNoMatches).toHaveBeenCalledWith("APP-REVIEW-001");
    expect(countPhoneMatches).toHaveBeenCalledWith("+97300000000");
    expect(countMembershipNoMatches).toHaveBeenCalledWith("MEMBER-APP-REVIEW-001");
    expect(countReviewAccounts).toHaveBeenCalledOnce();
    expect(insertReviewLawyer).toHaveBeenCalledWith({
      countryCode: "BH",
      email: "habib20298@gmail.com",
      passwordHash: "hashed-password",
      registrationNo: "APP-REVIEW-001",
      membershipNo: "MEMBER-APP-REVIEW-001",
      phone: "+97300000000",
      fullNameAr: "حساب مراجعة التطبيق",
      fullNameEn: "App Review Lawyer",
      status: "approved",
      isActive: true,
      isEmergencyReady: true,
      profileCompleted: true,
      isReviewAccount: true,
    });
    expect(log).toHaveBeenCalledWith(
      "Review lawyer account created for habib20298@gmail.com",
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("temporary-secret");
    expect(JSON.stringify(log.mock.calls)).not.toContain("hashed-password");
  });

  it.each([
    { emailMatches: 1, registrationMatches: 0, phoneMatches: 0, membershipMatches: 0, reviewAccounts: 0, reason: "matching email" },
    { emailMatches: 0, registrationMatches: 1, phoneMatches: 0, membershipMatches: 0, reviewAccounts: 0, reason: "matching registration" },
    { emailMatches: 0, registrationMatches: 0, phoneMatches: 1, membershipMatches: 0, reviewAccounts: 0, reason: "matching phone" },
    { emailMatches: 0, registrationMatches: 0, phoneMatches: 0, membershipMatches: 1, reviewAccounts: 0, reason: "matching membership" },
    { emailMatches: 0, registrationMatches: 0, phoneMatches: 0, membershipMatches: 0, reviewAccounts: 1, reason: "review account" },
  ])("aborts without inserting when a $reason already exists", async ({
    emailMatches,
    registrationMatches,
    phoneMatches,
    membershipMatches,
    reviewAccounts,
  }) => {
    const insertReviewLawyer = vi.fn(async () => 1);

    await expect(createReviewLawyerAccount({
      ...input,
      hash: async () => "hash",
      transaction: async (operation: TransactionOperation) => operation({
        countEmailMatches: async () => emailMatches,
        countRegistrationNoMatches: async () => registrationMatches,
        countPhoneMatches: async () => phoneMatches,
        countMembershipNoMatches: async () => membershipMatches,
        countReviewAccounts: async () => reviewAccounts,
        insertReviewLawyer,
      }),
      log: () => undefined,
    })).rejects.toThrow("Refusing to create review lawyer");

    expect(insertReviewLawyer).not.toHaveBeenCalled();
  });

  it("fails when the insert does not create exactly one account", async () => {
    await expect(createReviewLawyerAccount({
      ...input,
      hash: async () => "hash",
      transaction: async (operation: TransactionOperation) => operation({
        countEmailMatches: async () => 0,
        countRegistrationNoMatches: async () => 0,
        countPhoneMatches: async () => 0,
        countMembershipNoMatches: async () => 0,
        countReviewAccounts: async () => 0,
        insertReviewLawyer: async () => 0,
      }),
      log: () => undefined,
    })).rejects.toThrow("exactly one review lawyer");
  });

  it("requires all login and schema fields before opening a transaction", async () => {
    const transaction = vi.fn();

    await expect(createReviewLawyerAccount({
      ...input,
      registrationNo: "",
      hash: async () => "hash",
      transaction,
      log: () => undefined,
    })).rejects.toThrow("required");

    expect(transaction).not.toHaveBeenCalled();
  });
});
