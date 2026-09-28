// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import AgreementAdmin from "@/app/[locale]/admin/provider-agreement/AgreementAdmin";
import { legacyTemplate, modernDraft } from "./model";
// Signature canvas depends on a browser drawing context; this test exercises library selection, not drawing.
vi.mock("react-signature-canvas", () => ({ default: () => null }));
it("saves a new draft into the chosen template rather than the default group", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const group = {
    id: "00000000-0000-4000-8000-000000000002",
    name: "قالب مخصص",
    description: "",
    archived: false,
    revision: 1,
    activeVersionId: null,
    versionCount: 0,
  };
  let saved: Record<string, unknown> | undefined;
  vi.stubGlobal("confirm", () => true);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        saved = JSON.parse(String(init.body));
        return Response.json({
          ok: true,
          version: {
            id: "v1",
            number: 1,
            revision: 1,
            status: "draft",
            templateId: group.id,
            template: modernDraft(legacyTemplate()),
            createdAt: "2026-09-10",
          },
        });
      }
      return Response.json({ ok: true, versions: [], templates: [group] });
    }),
  );
  const holder = document.createElement("div"),
    root = createRoot(holder);
  try {
    await act(async () => root.render(<AgreementAdmin locale="ar" />));
    const choose = [...holder.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("قالب مخصص"),
    );
    expect(choose).toBeDefined();
    await act(async () => choose!.click());
    const save = [...holder.querySelectorAll("button")].find(
      (b) => b.textContent === "حفظ المسودة",
    )!;
    await act(async () => save.click());
    expect(saved?.templateId).toBe(group.id);
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
