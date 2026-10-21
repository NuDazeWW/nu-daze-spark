/** Scroll the app's main scroller (or window) so the section with `id` sits just below the top bar. */
export function scrollToSection(id: string, attempts = 12): void {
  const go = (left: number) => {
    const el = document.getElementById(id);
    if (!el) { if (left > 0) window.setTimeout(() => go(left - 1), 80); return; }
    const main = document.querySelector("main.sm-page");
    const offset = 16;
    if (main instanceof HTMLElement && main.scrollHeight > main.clientHeight) {
      const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - offset;
      main.scrollTo({ top, behavior: "smooth" });
    } else {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: "smooth" });
    }
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  };
  go(attempts);
}

/** Section id from a hash or href ("#a", "/x#a"), or null. */
export function sectionIdFrom(hrefOrHash: string): string | null {
  const i = hrefOrHash.indexOf("#");
  return i >= 0 && hrefOrHash.length > i + 1 ? decodeURIComponent(hrefOrHash.slice(i + 1)) : null;
}
