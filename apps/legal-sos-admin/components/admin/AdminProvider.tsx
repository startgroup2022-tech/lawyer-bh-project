"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { MockCase, MockLawyer } from "@/lib/mockData";

interface Toast {
  id: string;
  t: string;
}

interface AdminCtx {
  // Peek panels
  peekCase: MockCase | null;
  openCase: (c: MockCase | null) => void;
  peekLawyer: MockLawyer | null;
  openLawyer: (l: MockLawyer | null) => void;
  // Command palette
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  // Toasts
  toasts: Toast[];
  pushToast: (t: string) => void;
}

const AdminContext = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const v = useContext(AdminContext);
  if (!v) throw new Error("useAdmin must be used inside <AdminProvider>");
  return v;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [peekCase, setPeekCase] = useState<MockCase | null>(null);
  const [peekLawyer, setPeekLawyer] = useState<MockLawyer | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((t: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, t }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3500);
  }, []);

  // ⌘K / Ctrl+K toggles the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape" && paletteOpen) setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  // Welcome toast on first mount
  useEffect(() => {
    const t = setTimeout(
      () => pushToast("Real-time dispatch connected · 6 lawyers on-call"),
      800,
    );
    return () => clearTimeout(t);
  }, [pushToast]);

  return (
    <AdminContext.Provider
      value={{
        peekCase,
        openCase: setPeekCase,
        peekLawyer,
        openLawyer: setPeekLawyer,
        paletteOpen,
        setPaletteOpen,
        toasts,
        pushToast,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}
