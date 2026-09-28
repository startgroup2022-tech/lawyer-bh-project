// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import ProviderAgreementDisclosure from "@/components/ProviderAgreementDisclosure";
import { importBuilder } from "./builder-model";
import { legacyTemplate, parseTemplate, publicTemplate } from "./model";
it("shows structured parties and required inputs before acceptance becomes ready", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const builder = importBuilder(legacyTemplate());
  builder.parties.first.rows = [
    {
      id: "office",
      label: { ar: "عنوان المكتب", en: "Office address" },
      visible: true,
      source: { kind: "fixed", value: { ar: "المنامة", en: "Manama" } },
    },
  ];
  builder.fields = [
    {
      id: "degree",
      kind: "text",
      required: true,
      label: { ar: "المؤهل", en: "Qualification" },
      help: { ar: "أدخل المؤهل", en: "Enter qualification" },
      options: [],
    },
  ];
  vi.stubGlobal("fetch", async () =>
    Response.json({
      versionId: "v1",
      template: publicTemplate(parseTemplate({ builder })),
    }),
  );
  const holder = document.createElement("div"),
    root = createRoot(holder),
    ready = vi.fn();
  try {
    await act(async () =>
      root.render(
        <form>
          <ProviderAgreementDisclosure ar onReady={ready} />
        </form>,
      ),
    );
    expect(holder.textContent).toContain("عنوان المكتب");
    expect(holder.textContent).toContain("المنامة");
    const input = holder.querySelector<HTMLInputElement>(
      '[name="agreement_degree"]',
    );
    expect(input).not.toBeNull();
    expect(ready).toHaveBeenLastCalledWith(false);
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "بكالوريوس");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(ready).toHaveBeenLastCalledWith(true);
    expect(
      holder.querySelector<HTMLInputElement>(
        '[name="providerAgreementValues"]',
      )!.value,
    ).toBe('{"degree":"بكالوريوس"}');
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
