import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://altujar.bh"),
  title: {
    default: "Altujar.bh — Bahrain Company Creation",
    template: "%s | Altujar.bh",
  },
  description: "Fast-track your commercial registration in the Kingdom of Bahrain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
