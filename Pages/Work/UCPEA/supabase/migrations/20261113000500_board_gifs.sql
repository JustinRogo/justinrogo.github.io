-- UCPEA: allow animated GIF flyers.
--
-- Images are normally shrunk and re-encoded in the browser before upload, which
-- would keep only a GIF's first frame. GIFs are uploaded unchanged instead, so
-- the flyer buckets need to accept them. The 10 MB size cap still applies.

update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'application/pdf']
where id in ('board-public', 'board-members');
