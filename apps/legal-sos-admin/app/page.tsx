// Root entry — if signed in, send to dashboard; else to login.
// Both target routes do their own guard/check so this is just routing.

import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getAdminSession();
  redirect(session ? "/dashboard" : "/login");
}
