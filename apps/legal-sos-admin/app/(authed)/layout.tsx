// Authed layout — wraps every operator-only page with the dashboard
// chrome and enforces a valid admin session at the server.

import { AdminProvider } from "@/components/admin/AdminProvider";
import { PusherClientProvider } from "@/components/admin/PusherClient";
import { PostHogClientProvider } from "@/components/admin/PostHogClient";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { PeekPanel } from "@/components/admin/PeekPanel";
import { LawyerPeek } from "@/components/admin/LawyerPeek";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { Toasts } from "@/components/admin/Toasts";
import { requireAdminSession } from "@/lib/auth/guard";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side gate: redirects to /login if no valid session.
  const session = await requireAdminSession();

  return (
    <PostHogClientProvider adminUserId={session.adminUserId} email={session.email}>
      <AdminProvider>
        <PusherClientProvider>
          <div className="app">
            <Sidebar />
            <main className="main">
              <Topbar />
              <div className="content">{children}</div>
            </main>
            <PeekPanel />
            <LawyerPeek />
            <CommandPalette />
            <Toasts />
          </div>
        </PusherClientProvider>
      </AdminProvider>
    </PostHogClientProvider>
  );
}
