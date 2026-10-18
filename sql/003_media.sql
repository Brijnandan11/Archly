-- Publicly viewable club images; only the server secret key may upload/delete.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('coding-club-media','coding-club-media',true,8388608,ARRAY['image/webp'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
-- No anon/authenticated write policies: uploads are performed by admin-authorized Express server.
