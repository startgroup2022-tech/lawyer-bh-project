import { describe, expect, it } from "vitest";

import {
  createMobilePushStore,
  type MobilePushInstallation,
  type MobilePushPersistence,
} from "./mobile-push-store";

const LAWYER_A = "11111111-1111-4111-8111-111111111111";
const LAWYER_B = "22222222-2222-4222-8222-222222222222";
const REQUEST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REQUEST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

class MemoryPushPersistence implements MobilePushPersistence {
  private nextId = 1;
  readonly installations = new Map<string, MobilePushInstallation>();
  readonly requestLinks = new Set<string>();

  async findInstallationByToken(token: string) {
    return this.installations.get(token) ?? null;
  }

  async createInstallation(input: {
    token: string;
    lawyerId: string | null;
    audienceRole: "client" | "lawyer";
    platform: "ios";
    locale: "ar" | "en" | "tr";
  }) {
    const installation = { id: `installation-${this.nextId++}`, ...input };
    this.installations.set(input.token, installation);
    return installation;
  }

  async updateInstallation(
    id: string,
    input: {
      lawyerId?: string | null;
      audienceRole?: "client" | "lawyer";
      platform: "ios";
      locale: "ar" | "en" | "tr";
    },
  ) {
    const current = [...this.installations.values()].find(
      (installation) => installation.id === id,
    );
    if (!current) throw new Error("installation_not_found");
    const updated = {
      ...current,
      ...input,
      lawyerId: input.lawyerId === undefined ? current.lawyerId : input.lawyerId,
    };
    this.installations.set(current.token, updated);
    return updated;
  }

  async linkRequest(installationId: string, requestId: string) {
    this.requestLinks.add(`${installationId}:${requestId}`);
  }

  async unlinkRequest(installationId: string, requestId: string) {
    this.requestLinks.delete(`${installationId}:${requestId}`);
  }

  async deleteInstallationByToken(token: string) {
    this.installations.delete(token);
  }

  async clearLawyerBinding(token: string, lawyerId: string) {
    const current = this.installations.get(token);
    if (current?.lawyerId === lawyerId) {
      this.installations.set(token, {
        ...current,
        lawyerId: null,
        audienceRole: "client",
      });
    }
  }

  async tokensForLawyer(lawyerId: string) {
    return [...this.installations.values()]
      .filter((installation) => installation.lawyerId === lawyerId)
      .map((installation) => installation.token);
  }

  async tokensForRequest(requestId: string) {
    const installationIds = new Set(
      [...this.requestLinks]
        .filter((link) => link.endsWith(`:${requestId}`))
        .map((link) => link.split(":")[0]),
    );
    return [...this.installations.values()]
      .filter((installation) => installationIds.has(installation.id))
      .map((installation) => installation.token);
  }
}

describe("mobile push store", () => {
  it("registers a client but never downgrades an authenticated lawyer", async () => {
    const persistence = new MemoryPushPersistence();
    const store = createMobilePushStore(persistence);

    await store.registerClientInstallation({
      token: "fcm-shared-device",
      platform: "ios",
      locale: "ar",
    });
    expect(persistence.installations.get("fcm-shared-device")).toMatchObject({
      lawyerId: null,
      audienceRole: "client",
    });

    await store.registerLawyerInstallation({
      token: "fcm-shared-device",
      lawyerId: LAWYER_A,
      platform: "ios",
      locale: "en",
    });
    await store.registerClientInstallation({
      token: "fcm-shared-device",
      platform: "ios",
      locale: "ar",
    });
    expect(persistence.installations.get("fcm-shared-device")).toMatchObject({
      lawyerId: LAWYER_A,
      audienceRole: "lawyer",
      locale: "ar",
    });

    await store.unregisterLawyerInstallation("fcm-shared-device", LAWYER_A);
    expect(persistence.installations.get("fcm-shared-device")).toMatchObject({
      lawyerId: null,
      audienceRole: "client",
    });
  });

  it("reassigns a token to the currently authenticated lawyer", async () => {
    const persistence = new MemoryPushPersistence();
    const store = createMobilePushStore(persistence);

    await store.registerLawyerInstallation({
      token: "fcm-lawyer-device",
      lawyerId: LAWYER_A,
      platform: "ios",
      locale: "ar",
    });
    await store.registerLawyerInstallation({
      token: "fcm-lawyer-device",
      lawyerId: LAWYER_B,
      platform: "ios",
      locale: "en",
    });

    expect(await store.tokensForLawyer(LAWYER_A)).toEqual([]);
    expect(await store.tokensForLawyer(LAWYER_B)).toEqual([
      "fcm-lawyer-device",
    ]);
  });

  it("links one client installation to multiple authorized requests", async () => {
    const persistence = new MemoryPushPersistence();
    const store = createMobilePushStore(persistence);

    await store.subscribeClientRequest({
      token: "fcm-client-device",
      requestId: REQUEST_A,
      platform: "ios",
      locale: "ar",
    });
    await store.subscribeClientRequest({
      token: "fcm-client-device",
      requestId: REQUEST_B,
      platform: "ios",
      locale: "ar",
    });

    expect(await store.tokensForRequest(REQUEST_A)).toEqual([
      "fcm-client-device",
    ]);
    expect(await store.tokensForRequest(REQUEST_B)).toEqual([
      "fcm-client-device",
    ]);
  });

  it("rejects blank and oversized FCM tokens before persistence", async () => {
    const store = createMobilePushStore(new MemoryPushPersistence());

    await expect(
      store.subscribeClientRequest({
        token: "   ",
        requestId: REQUEST_A,
        platform: "ios",
        locale: "ar",
      }),
    ).rejects.toThrow("invalid_fcm_token");
    await expect(
      store.subscribeClientRequest({
        token: "x".repeat(4097),
        requestId: REQUEST_A,
        platform: "ios",
        locale: "ar",
      }),
    ).rejects.toThrow("invalid_fcm_token");
  });
});
