export const ADMIN_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function parseAdminProfilePayload(input: unknown, currentEmail: string) {
  const body = (input ?? {}) as Record<string, unknown>;
  const fullName = String(body.fullName ?? "").trim().replace(/\s+/g, " ");
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim().replace(/\s+/g, " ");
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  if (fullName.length < 2 || fullName.length > 180) throw new Error("invalid_name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("invalid_email");
  if (phone.length > 32 || (phone && !/^[+\d][\d\s()-]*$/.test(phone))) throw new Error("invalid_phone");
  const emailChanged = email !== currentEmail.trim().toLowerCase();
  if (newPassword && newPassword !== confirmPassword) throw new Error("password_mismatch");
  if (newPassword && (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword))) throw new Error("weak_password");
  if ((emailChanged || newPassword) && !currentPassword) throw new Error("current_password_required");
  return { fullName, email, phone, currentPassword, newPassword, confirmPassword, emailChanged };
}

export function validateAdminAvatar(file: { type: string; size: number }) {
  if (!AVATAR_TYPES.has(file.type)) throw new Error("invalid_avatar_type");
  if (file.size <= 0) throw new Error("empty_avatar");
  if (file.size > ADMIN_AVATAR_MAX_BYTES) throw new Error("avatar_too_large");
}
