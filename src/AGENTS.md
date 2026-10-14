# src rules

- Account photos are cropped client-side to a 512px PNG in private storage, so large transparent logos fit without uploading originals.
- External social links use shared `openInNewTab` since social sites refuse framing.
- Bulk export (Section 18) runs client-side in `src/lib/bulkExport.ts` with a versioned manifest schema and packages only cleared file-backed assets via the caller's session, so tenant RLS and permission states apply and nothing is published.
- Brand kits feed the creator-gated `generate-media` function; watermarks composite client-side (`src/lib/brandKit.ts`) into cleared `source_assets`.
- Decorative package effects use namespaced `--sm-fx-*` variables and `sm-app-bg`/`sm-light-page` surfaces set by AppLayout, so glow never collides with semantic color roles.
