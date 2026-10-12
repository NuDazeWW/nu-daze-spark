/**
 * Opens a URL in a real top-level browser tab. Must be called synchronously
 * inside the click handler (never after an `await`), otherwise browsers drop
 * the click's permission and the open can be blocked or land inside the
 * embedded preview frame — where sites like LinkedIn refuse to load
 * (ERR_BLOCKED_BY_RESPONSE).
 */
export function openInNewTab(url: string): boolean {
  let win: Window | null = null;
  try {
    win = window.open(url, "_blank");
  } catch { /* fall through */ }
  if (win) {
    try { win.opener = null; } catch { /* cross-origin, ignore */ }
    return true;
  }
  // Fallback: native anchor click.
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return false;
}

/**
 * Copies text and opens a URL from the same click. The clipboard write is
 * started first (while the page still has focus) and the tab is opened
 * immediately afterwards without waiting, so both keep the user's click.
 */
export function copyThenOpen(text: string | undefined, url: string): Promise<boolean> {
  const copied = text
    ? navigator.clipboard.writeText(text).then(() => true, () => false)
    : Promise.resolve(false);
  openInNewTab(url);
  return copied;
}
