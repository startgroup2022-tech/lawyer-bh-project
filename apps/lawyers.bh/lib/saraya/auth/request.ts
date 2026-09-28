import { ApiError, type SarayaPrincipal } from "./contracts";
export interface AccessVerifier { verifyAccess(token: string): SarayaPrincipal | Promise<SarayaPrincipal> }
export async function requireSarayaPrincipal(request: Request, verifier: AccessVerifier): Promise<SarayaPrincipal> { const value = request.headers.get("authorization"); if (!value?.startsWith("Bearer ")) throw new ApiError(401, "AUTH_REQUIRED", "يجب تسجيل الدخول", "Authentication required"); return verifier.verifyAccess(value.slice(7)); }
