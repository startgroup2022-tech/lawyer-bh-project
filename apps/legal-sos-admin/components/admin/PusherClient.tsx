// Browser-side Pusher client for the admin dashboard.
//
// One singleton connection per tab; channels are subscribed lazily by
// hooks that need them. Exposes a small context with the live
// connection state so the Topbar pill can reflect reality instead of
// pretending.

"use client";

import Pusher, { type Channel } from "pusher-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ConnState =
  | "initialized"
  | "connecting"
  | "connected"
  | "unavailable"
  | "failed"
  | "disconnected";

interface PusherCtx {
  state: ConnState;
  subscribe: (
    channelName: string,
    eventBindings: Record<string, (data: unknown) => void>,
  ) => () => void;
}

const Ctx = createContext<PusherCtx | null>(null);

export function usePusher() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePusher must be used inside <PusherClientProvider>");
  return v;
}

export function PusherClientProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnState>("initialized");
  const pusherRef = useRef<Pusher | null>(null);
  const channelCache = useRef(new Map<string, Channel>());

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "ap2";
    if (!key) {
      // Provider stays in 'initialized' state — Topbar pill will show
      // "WS not configured" so we don't claim a connection we don't have.
      return;
    }
    const p = new Pusher(key, { cluster, forceTLS: true });
    pusherRef.current = p;

    const update = (s: ConnState) => setState(s);
    p.connection.bind("state_change", (states: { current: ConnState }) =>
      update(states.current),
    );
    update(p.connection.state as ConnState);

    return () => {
      for (const ch of channelCache.current.values()) ch.unbind_all();
      channelCache.current.clear();
      p.disconnect();
      pusherRef.current = null;
    };
  }, []);

  const subscribe = useCallback(
    (channelName: string, bindings: Record<string, (data: unknown) => void>) => {
      const p = pusherRef.current;
      if (!p) return () => {};
      let ch = channelCache.current.get(channelName);
      if (!ch) {
        ch = p.subscribe(channelName);
        channelCache.current.set(channelName, ch);
      }
      const entries = Object.entries(bindings);
      for (const [event, fn] of entries) ch.bind(event, fn);
      return () => {
        for (const [event, fn] of entries) ch!.unbind(event, fn);
      };
    },
    [],
  );

  const value = useMemo<PusherCtx>(() => ({ state, subscribe }), [state, subscribe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
