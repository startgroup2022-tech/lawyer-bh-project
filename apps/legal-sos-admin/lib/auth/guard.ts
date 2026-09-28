// Server-side route guard. Call from any server component or route
// handler that must only run for a signed-in admin.

import { redirect } from "next/navigation";
import { getAdminSession, type AdminSession } from "./session";

/**
 * Ensures the caller has a valid admin session. Redirects to /login if
 * not. Returns the session so the page can show the operator's name.
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
