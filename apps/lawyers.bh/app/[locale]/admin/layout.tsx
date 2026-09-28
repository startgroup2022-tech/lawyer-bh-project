import type { Metadata } from "next";
import { privatePageRobots } from "@/lib/seo/indexing-policy";
import AdminRouteHeader from "@/components/admin/AdminRouteHeader";

export const metadata: Metadata = { robots: privatePageRobots };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] [&>main]:!bg-[#F7F8FA] [&>main]:!pt-4">
      <AdminRouteHeader />
      {children}
    </div>
  );
}
