"use client";

import { I } from "./Icons";
import { useAdmin } from "./AdminProvider";

export function Toasts() {
  const { toasts } = useAdmin();
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <I.check width="14" height="14" className="ic" />
          <span className="t">{t.t}</span>
        </div>
      ))}
    </div>
  );
}
