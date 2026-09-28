import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { deleteMember, memberAction, updateMember } from "@/lib/about-management/service";
import { parseAboutMemberInput } from "@/lib/about-management/validation";
import { aboutErrorResponse } from "@/lib/about-management/http";
import { del } from "@vercel/blob";
import { isManagedAboutPhotoKey } from "@/lib/about-management/photo";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { const admin = await requireAdminPermission("manage_about"); if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }); try { const { id } = await params; const body = await request.json(); if (body.action === "archive" || body.action === "restore") return NextResponse.json({ ok: true, member: await memberAction(id, body.action, { adminId: admin.id }) }); return NextResponse.json({ ok: true, member: await updateMember(id, parseAboutMemberInput(body), { adminId: admin.id }) }); } catch (e) { return aboutErrorResponse(e); } }
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) { if (!(await requireAdminPermission("manage_about"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }); try { const result=await deleteMember((await params).id);const token=process.env.BLOB_READ_WRITE_TOKEN;let cleanupWarning=false;if(token&&isManagedAboutPhotoKey(result.managedPhotoStorageKey))await del(result.managedPhotoStorageKey!,{token}).catch(()=>{cleanupWarning=true});return NextResponse.json({ ok: true, ...result, cleanupWarning }); } catch (e) { return aboutErrorResponse(e); } }
