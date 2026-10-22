# Back arrow next to the menu collapse button

## What you'll see
- On every signed-in page, a left arrow sits in the top bar directly beside the menu collapse button, same size (28x28 icon button, same style and hover).
- Clicking it returns to the page you were on before (browser history back).
- If there is no previous page in this session (e.g. opened from a fresh link), it goes to the Dashboard instead of leaving the app.
- Tooltip and screen-reader label: "Back to previous page". Hidden nowhere — shown on desktop and phone.

## Technical details
- New `src/components/layout/HeaderBackButton.tsx`: ghost `Button` size icon `h-7 w-7` (matches `SidebarTrigger`), `ArrowLeft` icon; `navigate(-1)` when `window.history.state?.idx > 0`, else `navigate("/")`.
- Insert it in `AppLayout.tsx` header right after `<SidebarTrigger />`, before the separator. Existing in-page BackLinks are left unchanged.
- Verify in browser: navigate Dashboard -> Post Office -> click arrow lands on Dashboard; size matches trigger.
