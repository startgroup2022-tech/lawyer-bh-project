/** Pure-Web-Audio siren. Used as the foreground alert in the lawyer
 *  dashboard when a new pickup lands. Works inside iOS WebView
 *  (which blocks the Notification API) as long as the user has
 *  interacted with the page at least once — the iOS audio policy
 *  caches that gesture for the rest of the session.
 *
 *  No audio assets are bundled; the sound is synthesised in real
 *  time from two sine oscillators sweeping between 880 Hz and
 *  440 Hz, which gives the classic "two-tone alarm" feel. */

let cachedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (cachedCtx && cachedCtx.state !== "closed") return cachedCtx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    cachedCtx = new Ctor();
    return cachedCtx;
  } catch {
    return null;
  }
}

/** Plays the alarm for `repeats` two-tone cycles. Returns a promise
 *  that resolves when audio playback finishes so callers can chain
 *  haptic / visual cues. Best-effort — never throws. */
export async function playSosAlarm(repeats = 2): Promise<void> {
  const ctx = getCtx();
  if (!ctx) return;
  // Some browsers suspend the AudioContext until a gesture; resume
  // is a no-op when already running and harmless when blocked.
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    /* ignore */
  }

  const cycleSec = 0.6;
  const total = cycleSec * repeats;
  const start = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  // Quick fade-in / fade-out so we don't click the speaker.
  gain.gain.linearRampToValueAtTime(0.4, start + 0.05);
  gain.gain.setValueAtTime(0.4, start + total - 0.1);
  gain.gain.linearRampToValueAtTime(0, start + total);
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  // Sweep between two pitches each cycle.
  osc.frequency.setValueAtTime(880, start);
  for (let i = 0; i < repeats; i++) {
    const base = start + i * cycleSec;
    osc.frequency.setValueAtTime(880, base);
    osc.frequency.linearRampToValueAtTime(440, base + cycleSec / 2);
    osc.frequency.linearRampToValueAtTime(880, base + cycleSec);
  }
  osc.connect(gain);
  osc.start(start);
  osc.stop(start + total);

  await new Promise<void>((resolve) =>
    setTimeout(resolve, Math.ceil(total * 1000) + 50),
  );
}

/** Tries to fire a haptic vibration on supported platforms. iOS
 *  WebView ignores this silently. */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
