export function schedulePaidRequestAdminNotifications(
  after: (task: () => Promise<void>) => void,
  run: () => Promise<unknown>,
  log: (message: string) => void = console.error,
): void {
  after(async () => {
    try {
      await run();
    } catch {
      log("[paid-request-admin-notifications] delivery unavailable");
    }
  });
}
