-- Add PDPA consent fields to ekyc_submissions table
-- This migration adds fields to track PDPA consent for eKYC verification

ALTER TABLE ekyc_submissions 
ADD COLUMN IF NOT EXISTS pdpa_consent_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pdpa_consent_given_at TIMESTAMP WITH TIME ZONE;

-- Add comment to document the purpose of these fields
COMMENT ON COLUMN ekyc_submissions.pdpa_consent_given IS 'Whether the user has provided PDPA consent for eKYC verification';
COMMENT ON COLUMN ekyc_submissions.pdpa_consent_given_at IS 'Timestamp when PDPA consent was given';

-- Create index for efficient querying of PDPA consent status
CREATE INDEX IF NOT EXISTS idx_ekyc_submissions_pdpa_consent 
ON ekyc_submissions(pdpa_consent_given, pdpa_consent_given_at);

-- Update RLS policies to include new fields
-- Note: Existing policies should automatically apply to new columns
-- but we'll verify the policies are working correctly

-- Verify that the new columns are accessible by users for their own submissions
-- and by admins for all submissions
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ekyc_submissions';

-- Add a constraint to ensure pdpa_consent_given_at is set when pdpa_consent_given is true
ALTER TABLE ekyc_submissions 
ADD CONSTRAINT check_pdpa_consent_timestamp 
CHECK (
    (pdpa_consent_given = FALSE) OR 
    (pdpa_consent_given = TRUE AND pdpa_consent_given_at IS NOT NULL)
);
