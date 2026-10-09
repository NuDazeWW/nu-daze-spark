# Native LinkedIn and Instagram Previews

## What you’ll get
A **Preview** action on post cards in Daily Queue and a preview inside the Posting Package in Approved Content. Previews use the selected client’s identity, actual draft copy, hashtags, and available attached media—not invented posts or engagement counts.

### LinkedIn
- Familiar feed layout with author identity, timestamp treatment, copy, media, and platform action icons.
- Collapsed copy with a working “see more” control.
- Character-limit warnings and an optional first-comment preview in the Posting Package.

### Instagram
- Feed preview with account header, image/video, carousel navigation when multiple images are available, caption truncation, and hashtags.
- Story preview in a 9:16 frame with frame navigation and the generated storyboard’s on-screen text.
- Reel preview in a 9:16 frame with playable attached video, caption, and recognizable platform controls.
- Clearly separate production scripts from audience-facing captions. Story/Reel outlines remain available to review; they won’t masquerade as published captions.

### Media and checks
- Use existing referenced assets and short-lived private media links. No new permissions or public storage.
- Show honest missing-media, loading, and failed-media states. Suggested visuals are not presented as finished assets.
- Offer fit/fill inspection and warn when the chosen media would be cropped, when vertical formats lack suitable media, or when the caption exceeds platform limits.
- Native layouts are simulations, not a guarantee of identical rendering on every platform version. Previewing does not publish or modify the post.

## Design
Keep SocialMotive’s current dark application styling around the preview, with platform-specific surfaces inside the mock post. Size previews consistently, keep text readable, and use accessible controls without fake interactive likes or comments.

## Technical approach
- Add a reusable native-preview view and dialog shared by Daily Queue and the existing Posting Package.
- Isolate caption/storyboard extraction into a small tested utility; preserve the original draft and fall back explicitly when a structured caption cannot be identified.
- Resolve only accessible referenced image/video assets through the existing authenticated Cloud client, preserving reference order and excluding blocked/archived assets.
- Keep this update frontend-only: no schema, AI-generation, approval, or publishing changes.

## Verification
- Test caption extraction, storyboard parsing, media filtering, and limit calculations.
- Check LinkedIn, Instagram feed, Story, and Reel views in the running app, including expansion, frame/media navigation, empty media, and error states.
- Check narrow layouts for overflow and ensure existing editing, review, and package controls still work.
