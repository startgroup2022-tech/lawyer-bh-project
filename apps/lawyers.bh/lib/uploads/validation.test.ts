import { expect, it } from "vitest";
import { validateSession, readBounded } from "./validation";
const session = {
  workflow: "join",
  browser_hash: "browser-a",
  principal: "",
  expires_at: new Date("2030-01-01"),
};
it("rejects foreign browser, workflow, principal and expired sessions", () => {
  expect(() =>
    validateSession(session, "join", "browser-a", "", new Date("2029-01-01")),
  ).not.toThrow();
  for (const [workflow, browser, principal] of [
    ["complete", "browser-a", ""],
    ["join", "browser-b", ""],
    ["join", "browser-a", "other"],
  ]) {
    expect(() =>
      validateSession(
        session,
        workflow,
        browser,
        principal,
        new Date("2029-01-01"),
      ),
    ).toThrow();
  }
  expect(() =>
    validateSession(session, "join", "browser-a", "", new Date("2030-01-01")),
  ).toThrow();
  expect(() => validateSession(null, "join", "browser-a", "")).toThrow();
});
it("bounds actual streamed bytes independently of metadata", async () => {
  await expect(
    readBounded(new Blob([new Uint8Array(5242880)]).stream(), 5242880),
  ).resolves.toHaveLength(5242880);
  await expect(
    readBounded(new Blob([new Uint8Array(5242881)]).stream(), 5242880),
  ).rejects.toThrow();
});
