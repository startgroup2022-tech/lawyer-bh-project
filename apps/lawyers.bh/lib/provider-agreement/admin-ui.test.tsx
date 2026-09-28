import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import FirstPartyFields from "@/app/[locale]/admin/provider-agreement/FirstPartyFields";
import { emptyFirstParty } from "./model";
it.each([true, false])(
  "shows both signing uploads and disables all editing for a locked version: %s",
  (disabled) => {
    const value = {
      ...emptyFirstParty(),
      signatureDataUrl: "data:image/png;base64,TEST",
    };
    const html = renderToStaticMarkup(
      <FirstPartyFields
        ar={true}
        value={value}
        disabled={disabled}
        onChange={() => {}}
        onUpload={async () => {}}
      />,
    );
    expect(html.match(/type="file"/g) || []).toHaveLength(2);
    expect(html).toContain('accept="image/png,image/jpeg"');
    expect(html).toContain("إزالة التوقيع");
    expect((html.match(/disabled=""/g) || []).length).toBe(disabled ? 7 : 0);
    expect(html).toContain("اسم المفوّض بالعربية");
    expect(html).toContain("ختم المنصة");
  },
);
