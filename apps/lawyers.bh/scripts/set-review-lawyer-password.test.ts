import { describe, expect, it, vi } from "vitest";

import { setReviewLawyerPassword } from "./set-review-lawyer-password.mjs";

type TransactionTools = {
  findFlaggedIds: (email: string) => Promise<string[]>;
  updateById: (id: string, passwordHash: string) => Promise<number>;
};

type TransactionOperation = (tools: TransactionTools) => Promise<void>;

describe("review lawyer password operation", () => {
  it("normalizes the email and updates only an already flagged review account", async () => {
    const hash = vi.fn(async () => "hashed-password");
    const findFlaggedIds = vi.fn(async () => ["review-1"]);
    const updateById = vi.fn(async () => 1);
    const log = vi.fn();

    await setReviewLawyerPassword({
      email: "  Habib20298@GMAIL.com ",
      password: "secret-value",
      hash,
      transaction: async (operation: TransactionOperation) => operation({ findFlaggedIds, updateById }),
      log,
    });

    expect(hash).toHaveBeenCalledWith("secret-value", 12);
    expect(findFlaggedIds).toHaveBeenCalledWith("habib20298@gmail.com");
    expect(updateById).toHaveBeenCalledWith("review-1", "hashed-password");
    expect(log).toHaveBeenCalledWith("Review lawyer password updated for habib20298@gmail.com");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-value");
  });

  it("fails unless exactly one review account is updated", async () => {
    await expect(setReviewLawyerPassword({
      email: "habib20298@gmail.com",
      password: "secret-value",
      hash: async () => "hash",
      transaction: async (operation: TransactionOperation) => operation({
        findFlaggedIds: async () => [],
        updateById: async () => 1,
      }),
      log: () => undefined,
    })).rejects.toThrow("exactly one flagged review lawyer");
  });

  it("does not modify any account when two flagged accounts match the email", async () => {
    const accounts = [
      { id: "review-1", email: "habib20298@gmail.com", passwordHash: "old-hash-1" },
      { id: "review-2", email: "HABIB20298@gmail.com", passwordHash: "old-hash-2" },
    ];

    await expect(setReviewLawyerPassword({
      email: "habib20298@gmail.com",
      password: "secret-value",
      hash: async () => "new-hash",
      transaction: async (operation: TransactionOperation) => operation({
        findFlaggedIds: async (email: string) => accounts
          .filter((account) => account.email.trim().toLowerCase() === email)
          .map((account) => account.id),
        updateById: async (id, passwordHash) => {
          const account = accounts.find((candidate) => candidate.id === id);
          if (account) account.passwordHash = passwordHash;
          return account ? 1 : 0;
        },
      }),
      log: () => undefined,
    })).rejects.toThrow("exactly one flagged review lawyer");

    expect(accounts.map((account) => account.passwordHash)).toEqual([
      "old-hash-1",
      "old-hash-2",
    ]);
  });

  it("starts the password update with postgres-js serializable isolation syntax", async () => {
    const passwordScript = await import("./set-review-lawyer-password.mjs") as {
      beginSerializableTransaction?: (
        sql: { begin: (options: string, operation: () => Promise<void>) => Promise<void> },
        operation: () => Promise<void>,
      ) => Promise<void>;
    };
    let receivedOptions = "";
    const sql = {
      begin: async (options: string, operation: () => Promise<void>) => {
        receivedOptions = options;
        await operation();
      },
    };

    expect(passwordScript.beginSerializableTransaction).toBeTypeOf("function");
    await passwordScript.beginSerializableTransaction?.(sql, async () => undefined);

    expect(receivedOptions).toBe("isolation level serializable");
  });
});
