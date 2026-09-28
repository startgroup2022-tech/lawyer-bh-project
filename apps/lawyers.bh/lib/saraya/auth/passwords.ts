import bcrypt from "bcryptjs";
import { ApiError } from "./contracts";
export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128) throw new ApiError(422, "INVALID_PASSWORD", "يجب أن تتكون كلمة المرور من 12 إلى 128 حرفًا", "Password must be between 12 and 128 characters", { password: ["INVALID_LENGTH"] });
  return bcrypt.hash(password, 12);
}
export async function verifyPassword(password: string, hash: string) { try { return await bcrypt.compare(password, hash); } catch { return false; } }
