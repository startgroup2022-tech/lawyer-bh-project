// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import FirstPartyFields from "@/app/[locale]/admin/provider-agreement/FirstPartyFields";
import { emptyFirstParty } from "./model";
it("routes file selection to the correct field and removes only the selected image", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const holder = document.createElement("div"),
    root = createRoot(holder),
    upload = vi.fn(async () => {});
  function Harness() {
    const [value, setValue] = useState({
      ...emptyFirstParty(),
      signatureDataUrl: "data:image/png;base64,AAAA",
      stampDataUrl: "data:image/png;base64,BBBB",
    });
    return (
      <FirstPartyFields
        ar={false}
        value={value}
        disabled={false}
        onChange={setValue}
        onUpload={upload}
      />
    );
  }
  try {
    await act(async () => root.render(<Harness />));
    const inputs =
        holder.querySelectorAll<HTMLInputElement>('input[type="file"]'),
      file = new File(["image"], "stamp.png", { type: "image/png" });
    Object.defineProperty(inputs[1], "files", { value: [file] });
    await act(async () => {
      inputs[1].dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(upload).toHaveBeenCalledWith("stampDataUrl", file);
    const remove = [...holder.querySelectorAll("button")].find(
      (b) => b.textContent === "Remove signature",
    )!;
    await act(async () => remove.click());
    expect(holder.querySelectorAll("img")).toHaveLength(1);
    expect(holder.querySelector("img")!.alt).toBe("Platform stamp preview");
  } finally {
    await act(async () => root.unmount());
  }
});
