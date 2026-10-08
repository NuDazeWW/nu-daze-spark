# Architecture rules

- Content hierarchy is Campaign Brief → Master Content Object → post_cards (platform variants, linked via brief_id / master_content_id); generate variants from an approved brief, not standalone, so every output traces to one approved message.
- Brief edits to strategic fields bump the version, revert approval, and flag linked master objects stale via a DB trigger, so drift is enforced server-side.
- Brief AI generation runs in the generate-from-brief edge function using the caller's session, so tenant RLS applies to every read and write.
