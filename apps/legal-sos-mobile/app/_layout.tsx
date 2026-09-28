// Initialise Sentry BEFORE anything else so even import-time errors
// in downstream modules get captured. The wrap() HOC ties the navigation
// container into Sentry for automatic breadcrumb tracking.

import { initSentry, wrap } from "../lib/sentry";
initSentry();

import { useMemo } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "posthog-react-native";
import { trpc, makeTrpcClient, makeQueryClient } from "../lib/trpc";
import { postHogConfig, isPostHogConfigured } from "../lib/posthog";
import { colors } from "../constants/theme";

function RootLayout() {
  // Each app boot gets a fresh QueryClient + tRPC client. The session
  // token is fetched fresh on every request inside httpBatchLink so
  // we don't need to re-create on sign-in.
  const queryClient = useMemo(() => makeQueryClient(), []);
  const trpcClient = useMemo(() => makeTrpcClient(), []);

  const inner = (
    <SafeAreaProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: "slide_from_right",
            }}
          />
        </QueryClientProvider>
      </trpc.Provider>
    </SafeAreaProvider>
  );

  // Skip the provider entirely when the key isn't set so dev without
  // EXPO_PUBLIC_POSTHOG_KEY doesn't error.
  if (!isPostHogConfigured()) return inner;

  return <PostHogProvider {...postHogConfig}>{inner}</PostHogProvider>;
}

export default wrap(RootLayout);
