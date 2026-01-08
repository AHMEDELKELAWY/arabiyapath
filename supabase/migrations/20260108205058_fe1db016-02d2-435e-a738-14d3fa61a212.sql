-- Create storage bucket for lesson images
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-images', 'lesson-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to lesson images
CREATE POLICY "Public read access for lesson images"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-images');

-- Allow service role to upload images
CREATE POLICY "Service role can upload lesson images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lesson-images');

-- Allow service role to update images
CREATE POLICY "Service role can update lesson images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lesson-images');

-- Allow service role to delete images
CREATE POLICY "Service role can delete lesson images"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-images');