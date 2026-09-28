// Root layout — minimal. Provides HTML/body, fonts, and tRPC client
// to BOTH the public `/login` route and the authed `(authed)/*` group.
//
// Sidebar/Topbar/Peek/Palette/Toasts live in `app/(authed)/layout.tsx`
// so the login page renders bare.

import type { Metadata } from "next";
import TRPCProvider from "@/components/TRPCProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legal SOS · Admin console",
  description: "Operations dashboard for Legal SOS dispatch.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
