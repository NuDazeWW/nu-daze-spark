/** Reset only this newly opened surface, including its nested scroll areas. */
export function resetOpeningScroll(surface: HTMLElement) {
  for (const element of [surface, ...surface.querySelectorAll<HTMLElement>("*")]) {
    if (element.scrollTop !== 0) element.scrollTop = 0;
  }
}

/** Let accessible autofocus finish, then undo any scrolling it caused. */
export function resetOverlayOpeningScroll(event: Event) {
  const surface = event.currentTarget;
  if (!(surface instanceof HTMLElement)) return;
  resetOpeningScroll(surface);
  requestAnimationFrame(() => {
    if (surface.isConnected && surface.dataset.state !== "closed") resetOpeningScroll(surface);
  });
}