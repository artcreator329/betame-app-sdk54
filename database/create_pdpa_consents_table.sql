-- Create PDPA consents table
-- This table stores PDPA consent records with PDF documents for audit trail

CREATE TABLE IF NOT EXISTS pdpa_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consent_ip_address INET,
  consent_user_agent TEXT,
  pdf_url TEXT NOT NULL,
  document_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments to document the purpose of each column
COMMENT ON TABLE pdpa_consents IS 'Stores PDPA consent records with PDF documents for legal compliance and audit trail';
COMMENT ON COLUMN pdpa_consents.user_id IS 'Reference to the user who provided consent';
COMMENT ON COLUMN pdpa_consents.user_name IS 'Real name of the user as provided for PDPA consent';
COMMENT ON COLUMN pdpa_consents.user_email IS 'Email address of the user';
COMMENT ON COLUMN pdpa_consents.consent_given_at IS 'Timestamp when consent was provided';
COMMENT ON COLUMN pdpa_consents.consent_ip_address IS 'IP address from which consent was provided (for audit trail)';
COMMENT ON COLUMN pdpa_consents.consent_user_agent IS 'User agent string from which consent was provided (for audit trail)';
COMMENT ON COLUMN pdpa_consents.pdf_url IS 'URL to the signed PDPA consent PDF document';
COMMENT ON COLUMN pdpa_consents.document_id IS 'Unique document identifier for the PDPA consent form';
COMMENT ON COLUMN pdpa_consents.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN pdpa_consents.updated_at IS 'Timestamp when the record was last updated';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pdpa_consents_user_id ON pdpa_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_pdpa_consents_consent_given_at ON pdpa_consents(consent_given_at);
CREATE INDEX IF NOT EXISTS idx_pdpa_consents_document_id ON pdpa_consents(document_id);
CREATE INDEX IF NOT EXISTS idx_pdpa_consents_created_at ON pdpa_consents(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_pdpa_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_pdpa_consents_updated_at
  BEFORE UPDATE ON pdpa_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_pdpa_consents_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE pdpa_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own PDPA consent records
CREATE POLICY "Users can view their own PDPA consent records" ON pdpa_consents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own PDPA consent records
CREATE POLICY "Users can insert their own PDPA consent records" ON pdpa_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all PDPA consent records
CREATE POLICY "Admins can view all PDPA consent records" ON pdpa_consents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can update PDPA consent records
CREATE POLICY "Admins can update PDPA consent records" ON pdpa_consents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can delete PDPA consent records
CREATE POLICY "Admins can delete PDPA consent records" ON pdpa_consents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Add constraint to ensure document_id is unique and properly formatted
ALTER TABLE pdpa_consents 
ADD CONSTRAINT check_document_id_format 
CHECK (document_id ~ '^PDPA-\d+-[a-zA-Z0-9-]+$');

-- Add constraint to ensure consent_given_at is not in the future
ALTER TABLE pdpa_consents 
ADD CONSTRAINT check_consent_given_at_not_future 
CHECK (consent_given_at <= NOW());

-- Add constraint to ensure user_name is not empty
ALTER TABLE pdpa_consents 
ADD CONSTRAINT check_user_name_not_empty 
CHECK (LENGTH(TRIM(user_name)) > 0);

-- Add constraint to ensure user_email is valid format
ALTER TABLE pdpa_consents 
ADD CONSTRAINT check_user_email_format 
CHECK (user_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
