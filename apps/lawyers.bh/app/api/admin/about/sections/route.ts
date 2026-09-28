import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { createSection } from "@/lib/about-management/service";
import { parseAboutSectionInput } from "@/lib/about-management/validation";
import { aboutErrorResponse } from "@/lib/about-management/http";
export async function POST(request: Request) { const admin = await requireAdminPermission("manage_about"); if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }); try { return NextResponse.json({ ok: true, section: await createSection(parseAboutSectionInput(await request.json()), { adminId: admin.id }) }, { status: 201 }); } catch (e) { return aboutErrorResponse(e); } }
