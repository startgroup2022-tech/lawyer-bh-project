import { describe, expect, it } from "vitest";
import { translateAccountPersistenceError } from "./persistence-errors";

describe("Saraya account persistence errors", () => {
  it("turns a duplicate login identity into a safe conflict", () => {
    expect(() =>
      translateAccountPersistenceError({
        code: "23505",
        constraint: "saraya_users_normalized_email_uidx",
      }),
    ).toThrowError(
      expect.objectContaining({ status: 409, code: "IDENTITY_ALREADY_USED" }),
    );
  });

  it("does not hide unrelated database failures", () => {
    const failure = new Error("connection unavailable");
    expect(() => translateAccountPersistenceError(failure)).toThrow(failure);
  });
});
