-- UCPEA: flyer-only posts.
--
-- When flyer_only is true, the corkboard shows just the flyer image; people
-- click it to see the title, summary, and details. The list layout still shows
-- the text, so it remains the plain fallback. Only image flyers qualify: a PDF
-- can't be shown as a picture on the board.

alter table public.posts
  add column flyer_only boolean not null default false;

alter table public.posts
  add constraint flyer_only_needs_image
    check (not flyer_only or (image_path is not null and image_path !~* '\.pdf$'));

grant insert (flyer_only), update (flyer_only) on public.posts to authenticated;
