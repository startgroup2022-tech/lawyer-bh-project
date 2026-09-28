import { NextResponse } from "next/server";
import { AboutManagementError } from "./types";
export function aboutErrorResponse(error: unknown) { if (error instanceof AboutManagementError) return NextResponse.json({ ok: false, error: error.code }, { status: error.status }); console.error("About management error", error); return NextResponse.json({ ok: false, error: "about_management_failed" }, { status: 500 }); }
