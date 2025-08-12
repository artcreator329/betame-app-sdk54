-- Add cover_photo_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Add comment to document the field
COMMENT ON COLUMN profiles.cover_photo_url IS 'URL for user cover photo/background image';