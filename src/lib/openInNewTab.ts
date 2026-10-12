/**
 * Opens a URL in a top-level new browser tab. Uses a programmatic anchor
 * click instead of window.open: more reliable under popup blockers, and
 * guarantees a real tab — sites like LinkedIn refuse to load inside
 * embedded frames (ERR_BLOCKED_BY_RESPONSE).
 */
export function openInNewTab(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
