// Auth hooks + helpers for the mobile app.
//
// Phase A will add:
//   • requestOtp(phone, role)        — sends SMS via Twilio Verify
//   • verifyOtp(phone, code, role)   — exchanges code for { accessJwt, refreshToken }
//   • refreshSession()               — exchanges refresh token for new access JWT
// All three are wired through the tRPC `mobile.auth.*` namespace once
// the backend lands.
//
// For now this module exposes the local-state primitives so screens can
// be written defensively (`useSession()` returns null while signed out
// instead of crashing).

import { useEffect, useState } from "react";
import {
  getSessionRole,
  getSessionToken,
  clearSessionToken,
  clearRefreshToken,
  clearSessionRole,
  clearActiveCaseRef,
  type SessionRole,
} from "./secureStore";

export interface Session {
  /** Short-lived access JWT (raw). */
  token: string;
  role: SessionRole;
}

/**
 * Read the persisted session once on mount. Re-runs only when the
 * caller manually invalidates by calling the returned `reload` fn.
 */
export function useSession(): {
  session: Session | null;
  loading: boolean;
  reload: () => Promise<void>;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [token, role] = await Promise.all([
      getSessionToken(),
      getSessionRole(),
    ]);
    if (token && role) {
      setSession({ token, role });
    } else {
      setSession(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [token, role] = await Promise.all([
        getSessionToken(),
        getSessionRole(),
      ]);
      if (!mounted) return;
      if (token && role) {
        setSession({ token, role });
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { session, loading, reload };
}

/**
 * Fully sign the user out: clear all session-scoped storage. Caller is
 * responsible for navigating to the entry screen afterwards.
 */
export async function signOut(): Promise<void> {
  await Promise.all([
    clearSessionToken(),
    clearRefreshToken(),
    clearSessionRole(),
    clearActiveCaseRef(),
  ]);
}
