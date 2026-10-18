# src rules
- Brand & Strategy Studio owns a shared Tabs context above its three columns, so tab changes preserve brand edits and watermark state.

- Account photos are cropped client-side to a 512px PNG in private storage, so large transparent logos fit without uploading originals.
- External social links use shared `openInNewTab` since social sites refuse framing.
- Bulk export (Section 18) runs client-side in `src/lib/bulkExport.ts` with a versioned manifest schema and packages only cleared file-backed assets via the caller's session, so tenant RLS and permission states apply and nothing is published.
- Brand kits feed the creator-gated `generate-media` function; watermarks composite client-side (`src/lib/brandKit.ts`) into cleared `source_assets`.
- Decorative package effects use namespaced `--sm-fx-*` variables and `sm-app-bg`/`sm-light-page` surfaces set by AppLayout, so glow never collides with semantic color roles.
- Reference-page composition uses scoped `sm-reference` classes in existing pages and centralized surface selection; preserve hooks, copy, permissions and handlers because the uploaded package is visual reference only.
- Brief approval runs through `submit_brief`/`decide_brief` RPCs (a trigger blocks direct approval when approval mode is on); a named Approver or any Admin decides, and open `brief_comments` block generation in both UI and `generate-from-brief`, so feedback can't be skipped.
- Queue, Approved and Publishing share `PipelineNav` as three views of one content pipeline, so users always see where a post sits.
- The final SocialMotive design system is the last block of `src/index.css` (`--ds-*` tokens plus shared button/input/tab/dialog/sidebar rules) and `Button` variants ai/success/warning; extend it there rather than adding per-page patches, because it supersedes earlier layers.
- Native social previews share one read-only view between Queue and Posting Package, parse production outlines separately from captions, and resolve tenant-scoped cleared media with short-lived signed URLs; this avoids draft mutation, invented content, and public media exposure.
- Page surface selection is centralized in `contentPresentation.ts` and applied by AppLayout to body-level semantic tokens so portalled controls inherit the reading theme; command/navigation surfaces explicitly retain dark tokens.
- Content type and lifecycle status are independent presentation attributes; shared status classes drive cards, badges, calendar chips, filters, and pipeline charts so colors stay consistent across screens.
- External-post author context is optional structured data with manual/source provenance; shared presentation validates platform profile links, while discovery retains only details grounded in retrieved evidence to prevent inferred identities.
