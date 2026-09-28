import { sqlClient } from "@/lib/db/client";
import { mobileAdminTokenDigest } from "@/lib/mobile-admin/auth-core";
import { requireMobileAdmin } from "@/lib/mobile-admin/auth";
import { bearerToken } from "@/lib/mobile-admin/auth-http";
import { registerAdminInstallation, removeAdminInstallation } from "@/lib/mobile-admin/push-installations-core";
import { createAdminPushInstallationsHttp } from "@/lib/mobile-admin/push-installations-http";
import { createAdminInstallationStore } from "@/lib/mobile-admin/push-installations-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const store = createAdminInstallationStore(sqlClient as never);
const handlers = createAdminPushInstallationsHttp({
  authorize: async (request) => {
    const admin = await requireMobileAdmin(request);
    return admin ? { id: admin.id, sessionDigest: mobileAdminTokenDigest(bearerToken(request)) } : null;
  },
  register: (input) => registerAdminInstallation(input, store),
  remove: (input) => removeAdminInstallation(input, store),
});

export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
