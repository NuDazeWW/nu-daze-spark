# Campaign Briefs page body redesign (match reference image)

Header and side navigation stay as they are. Wording, data, buttons and behavior stay the same — only layout and styling of the page body change.

## Layout to match the image
1. **Intro strip** — "From strategy to execution" becomes one wide glowing card with three columns, each with a round outlined icon (target, layers, shield) next to its title and text.
2. **Left column "Campaign briefs" panel** — a framed panel titled "Campaign briefs" with a search icon in the corner; each brief is a tile with a glowing cyan border when selected and an Approved pill.
3. **Selected brief panel** — status pill above the title; large title with type and version beneath; action buttons laid out on two rows on the right (Edit, Campaign one-pager, AI completeness review; then the brand voice picker, Test 3 angles, and a bright cyan Generate content set).
4. **Brief completeness card** — thick cyan progress bar with the percentage on the right; the "Ready to generate" checklist sits inside its own glowing card with a large green check and green tick for each line.
5. **Strategy & messaging section** — new section heading with icon ("Core campaign foundation" subtitle). Each brief field becomes its own tile with a matching icon: Objective, Target audience, Core message, Proof points (bulleted list) as tall tiles in two columns; Primary CTA, Destination URL, Success metric, Timing, Channels, Constraints as compact tiles.
6. **Feedback & discussion** — section with icon, All / Open items toggle on the right, glowing comment box with Post comment button tucked bottom-right.
7. **Master content objects** — section heading with icon and "Generated from this brief" subtitle; posts shown as a two-column grid of tiles, each with platform icon, platform and type label, status pill, menu, and preview text.

## Check
- Screenshot `/briefs` at your current screen size and compare against the image; confirm every button still works.

## Technical details
- Edit only `src/pages/CampaignBriefs.tsx` markup (Field gets an icon map) and the `BriefDiscussion` card in `BriefCollaboration.tsx`; add `sm-briefs-*` styles in `src/index.css` using existing design tokens.
- No changes to queries, mutations, permissions or `PageHeader`/sidebar.
