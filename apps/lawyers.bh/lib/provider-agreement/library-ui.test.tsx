// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import TemplateLibrary from "@/app/[locale]/admin/provider-agreement/TemplateLibrary";
it("shows the active global template and prevents archiving it", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const holder = document.createElement("div"),
    root = createRoot(holder),
    action = vi.fn();
  try {
    await act(async () =>
      root.render(
        <TemplateLibrary
          ar
          templates={[
            {
              id: "one",
              name: "القالب الأول",
              description: "وصف",
              archived: false,
              revision: 1,
              activeVersionId: "version",
              versionCount: 1,
            },
          ]}
          selectedId="one"
          disabled={false}
          onChoose={() => {}}
          onAction={action}
        />,
      ),
    );
    expect(holder.textContent).toContain("المعتمد للجميع");
    const archive = [...holder.querySelectorAll("button")].find(
      (b) => b.textContent === "أرشفة القالب",
    )!;
    expect(archive.disabled).toBe(true);
    await act(async () => archive.click());
    expect(action).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
  }
});
