/** The element that actually scrolls the page: the app's main panel, or the window. */
export function appScroller(): HTMLElement | null {
  const main = document.querySelector<HTMLElement>("main.sm-page");
  return main && main.scrollHeight > main.clientHeight + 1 ? main : null;
}

/** How far down the page the reader currently is, in pixels. */
export function getAppScrollTop(): number {
  const main = appScroller();
  if (main) return main.scrollTop;
  return Math.round(window.scrollY || document.documentElement.scrollTop || 0);
}

/** Smooth-scroll the page back to the very top. */
export function scrollAppToTop(): void {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
  appScroller()?.scrollTo({ top: 0, behavior });
  window.scrollTo({ top: 0, behavior });
}
