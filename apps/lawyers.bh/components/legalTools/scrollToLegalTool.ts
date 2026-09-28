type ScrollTarget = Pick<Element, "scrollIntoView">;
type FrameScheduler = (callback: FrameRequestCallback) => number | void;

export function scrollToLegalTool(
  target: ScrollTarget,
  prefersReducedMotion: boolean,
  scheduleFrame: FrameScheduler = requestAnimationFrame,
) {
  scheduleFrame(() => {
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  });
}
