# Author context in Comment Generator

## What will change
- **LinkedIn:** show the author's job title and employer beneath their name, when supplied by the original source or a team member.
- **Instagram:** show their @handle and public bio or account category (such as creator, business, or industry specialty), when available. Show an associated organization if explicitly supplied.
- Offer an **Open profile** link when a valid platform profile URL is available; keep **Open original post** separate.
- Include employer, role, handle, and bio in the existing search.
- Where details are missing, clearly display **Workplace details unavailable** or **Profile details unavailable**, rather than guessing from the post topic.

## Capturing details
- Extend **Add Post** with optional platform-appropriate author fields.
- Add an **Edit author details** action to existing cards, so the team can supply or correct information without recreating the post.
- Update **Find Posts** to capture only author details explicitly visible in its retrieved source material, with supporting source text. Never infer employment from a company mentioned in the post.
- Existing posts will not receive invented or automatic backfilled details. External profile enrichment, Clay searches, and additional provider charges are not included.

## Technical details
- Add optional structured author context to `external_posts`; retain existing tenant permissions and authentication.
- Use a shared author-context formatter and display component, semantic brand tokens, and safe platform URL validation.
- Store whether context came from retrieved source material or manual entry, and show that provenance alongside the details.
- Document the author-context storage/presentation convention in `AGENTS.md`.

## Verification
- Test LinkedIn title/employer, Instagram handle/bio, partial/missing data, unsafe profile links, and searchable context.
- Verify a saved author edit reads back on an existing real post in the signed-in Comment Generator; check the Add Post fields without adding fake campaign data.
- Verify existing selection, comments, original-post links, and filters still work.