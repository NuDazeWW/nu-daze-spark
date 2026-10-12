CREATE SEQUENCE IF NOT EXISTS public.post_cards_post_number_seq;
ALTER TABLE public.post_cards ADD COLUMN IF NOT EXISTS post_number bigint;
WITH ordered AS (SELECT id, row_number() OVER (ORDER BY created_at, id) AS n FROM public.post_cards)
UPDATE public.post_cards p SET post_number = o.n FROM ordered o WHERE o.id = p.id AND p.post_number IS NULL;
SELECT setval('public.post_cards_post_number_seq', GREATEST((SELECT COALESCE(MAX(post_number),0) FROM public.post_cards), 1));
ALTER TABLE public.post_cards ALTER COLUMN post_number SET DEFAULT nextval('public.post_cards_post_number_seq');
ALTER SEQUENCE public.post_cards_post_number_seq OWNED BY public.post_cards.post_number;
GRANT USAGE, SELECT ON SEQUENCE public.post_cards_post_number_seq TO authenticated, service_role;
CREATE UNIQUE INDEX IF NOT EXISTS post_cards_post_number_key ON public.post_cards(post_number);