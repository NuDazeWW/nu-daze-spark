ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS review_chips jsonb NOT NULL DEFAULT '[
 {"label":"Punchier hook","instruction":"Rewrite the opening line as a sharper, more specific hook that earns the next line. Keep the core message."},
 {"label":"Tone too formal","instruction":"Make the tone more conversational and human. Use plainer words and shorter sentences; keep it professional."},
 {"label":"Shorten copy","instruction":"Cut the copy by roughly a third. Keep the hook, the key point and the call to action; remove filler."},
 {"label":"Stronger CTA","instruction":"End with one clear, direct call to action that tells the reader exactly what to do next."},
 {"label":"Remove acronyms","instruction":"Replace every acronym and jargon term with plain words a general reader understands."},
 {"label":"Remove hashtags","instruction":"Remove all hashtags from the caption and the hashtag list."}
]'::jsonb;