import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase-admin/app", () => ({
  cert: vi.fn((value) => value),
  getApps: vi.fn(() => []),
  initializeApp: vi.fn((value) => value),
}));
vi.mock("firebase-admin/messaging", () => ({
  getMessaging: vi.fn((value) => ({ app: value })),
}));

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  vi.resetModules();
});

describe("Firebase Admin configuration", () => {
  it("reports every missing credential name without exposing values", async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;

    const firebaseAdmin = await import("./firebase-admin");

    expect(() => firebaseAdmin.firebaseAdminConfig(process.env)).toThrowError(
      "firebase_admin_not_configured:FIREBASE_PROJECT_ID,FIREBASE_CLIENT_EMAIL,FIREBASE_PRIVATE_KEY",
    );
  });

  it("trims values and normalizes escaped private-key newlines", async () => {
    const firebaseAdmin = await import("./firebase-admin");

    expect(
      firebaseAdmin.firebaseAdminConfig({
        FIREBASE_PROJECT_ID: " legalsos-d9f53 ",
        FIREBASE_CLIENT_EMAIL: " service@example.test ",
        FIREBASE_PRIVATE_KEY: " line-one\\nline-two ",
      }),
    ).toEqual({
      projectId: "legalsos-d9f53",
      clientEmail: "service@example.test",
      privateKey: "line-one\nline-two",
    });
  });
});
