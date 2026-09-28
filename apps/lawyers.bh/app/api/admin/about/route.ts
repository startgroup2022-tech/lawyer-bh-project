import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { listAdminAbout } from "@/lib/about-management/service";
export async function GET() { if (!(await requireAdminPermission("manage_about"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }); return NextResponse.json({ ok: true, ...(await listAdminAbout()) }); }
