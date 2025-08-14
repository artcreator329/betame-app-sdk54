-- Create service_feature_applications table to track when features are applied to services
CREATE TABLE IF NOT EXISTS service_feature_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('feature_2x', 'boost_instant', 'showcase_max', 'boost_feature_max')),
  feature_name TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_feature_applications_user_id ON service_feature_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_service_feature_applications_service_id ON service_feature_applications(service_id);
CREATE INDEX IF NOT EXISTS idx_service_feature_applications_expires_at ON service_feature_applications(expires_at);
CREATE INDEX IF NOT EXISTS idx_service_feature_applications_feature_type ON service_feature_applications(feature_type);

-- Enable RLS (Row Level Security)
ALTER TABLE service_feature_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own service feature applications" ON service_feature_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own service feature applications" ON service_feature_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service feature applications" ON service_feature_applications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service feature applications" ON service_feature_applications
  FOR DELETE USING (auth.uid() = user_id);

-- Add a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_service_feature_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_feature_applications_updated_at
  BEFORE UPDATE ON service_feature_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_service_feature_applications_updated_at();