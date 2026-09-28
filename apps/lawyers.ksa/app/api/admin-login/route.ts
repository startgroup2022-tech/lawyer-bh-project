import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { setAdminSession } from "@/lib/auth/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    email?: string;
    password?: string;
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required" },
      { status: 400 },
    );
  }

  try {
    const [admin] = await db
      .select({
        id: schema.adminUsers.id,
        fullName: schema.adminUsers.fullName,
        email: schema.adminUsers.email,
        passwordHash: schema.adminUsers.passwordHash,
        role: schema.adminUsers.role,
        isActive: schema.adminUsers.isActive,
      })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, email))
      .limit(1);

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { ok: false, error: "Invalid login details" },
        { status: 401 },
      );
    }

    const passwordOk = await bcrypt.compare(password, admin.passwordHash);

    if (!passwordOk) {
      return NextResponse.json(
        { ok: false, error: "Invalid login details" },
        { status: 401 },
      );
    }

    await db
      .update(schema.adminUsers)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.adminUsers.id, admin.id));

    await setAdminSession({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return NextResponse.json({
      ok: true,
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("[admin-login] failed", err);

    return NextResponse.json(
      { ok: false, error: "Login failed" },
      { status: 500 },
    );
  }
}