-- Migration to clean up and normalize existing service types for AI-powered service type system
-- This migration will update existing service category names to be more consistent and user-friendly

-- First, let's see what service types we currently have
-- SELECT DISTINCT category_name, COUNT(*) as count FROM services WHERE category_name IS NOT NULL GROUP BY category_name ORDER BY count DESC;

-- Update existing service types to be more user-friendly and consistent
-- This maps the old IDs and inconsistent names to proper display names

UPDATE services 
SET category_name = CASE 
  -- Personal Care & Wellness
  WHEN category_name = 'beauty-cosmetics' THEN 'Beauty & Cosmetics'
  WHEN category_name = 'fitness-training' THEN 'Fitness & Personal Training'
  WHEN category_name = 'massage-wellness' THEN 'Massage & Wellness'
  WHEN category_name = 'healthcare-medical' THEN 'Healthcare & Medical Services'
  WHEN category_name = 'wellness-mental-health' THEN 'Wellness & Mental Health'
  
  -- Home & Living
  WHEN category_name = 'cleaning-maintenance' THEN 'Cleaning & Maintenance'
  WHEN category_name = 'repair-maintenance' THEN 'Repair & Maintenance'
  WHEN category_name = 'gardening-landscaping' THEN 'Gardening & Landscaping'
  WHEN category_name = 'interior-design' THEN 'Interior Design'
  WHEN category_name = 'plumbing-electrical' THEN 'Plumbing & Electrical'
  WHEN category_name = 'home-living' THEN 'Home & Living'
  WHEN category_name = 'Home Services' THEN 'Home Services'
  
  -- Professional Services  
  WHEN category_name = 'consulting-strategy' THEN 'Consulting & Strategy'
  WHEN category_name = 'legal-services' THEN 'Legal Services'
  WHEN category_name = 'accounting-finance' THEN 'Accounting & Finance Services'
  WHEN category_name = 'marketing-advertising' THEN 'Marketing & Advertising'
  WHEN category_name = 'hr' THEN 'Human Resources'
  WHEN category_name = 'research-analysis' THEN 'Research & Analysis'
  WHEN category_name = 'insurance-services' THEN 'Insurance Services'
  WHEN category_name = 'Professional Services' THEN 'Professional Services'
  
  -- Creative & Media
  WHEN category_name = 'photography-videography' THEN 'Photography & Videography'
  WHEN category_name = 'graphic-design' THEN 'Graphic Design & Creative'
  WHEN category_name = 'music-audio' THEN 'Music & Audio Production'
  WHEN category_name = 'social-media' THEN 'Social Media Management'
  WHEN category_name = 'writing-content' THEN 'Writing & Content Creation'
  WHEN category_name = 'arts-entertainment' THEN 'Arts & Entertainment'
  
  -- Technology
  WHEN category_name = 'digital-it' THEN 'Digital & IT'
  WHEN category_name = 'programming-development' THEN 'Programming & Development'
  WHEN category_name = 'technology-support' THEN 'Technology Support'
  
  -- Events & Entertainment
  WHEN category_name = 'event-planning' THEN 'Event Planning & Management'
  WHEN category_name = 'cooking-catering' THEN 'Cooking & Catering'
  WHEN category_name = 'gaming-streaming' THEN 'Gaming & Streaming'
  WHEN category_name = 'wedding-services' THEN 'Wedding Services'
  WHEN category_name = 'fnb' THEN 'Food & Beverage'
  
  -- Education & Training
  WHEN category_name = 'education-training' THEN 'Education & Training'
  WHEN category_name = 'tutoring-academic' THEN 'Tutoring & Academic Support'
  WHEN category_name = 'language-translation' THEN 'Language & Translation'
  
  -- Transportation & Delivery
  WHEN category_name = 'delivery-logistics' THEN 'Delivery & Logistics'
  WHEN category_name = 'logistics-supply-chain' THEN 'Logistics & Supply Chain'
  WHEN category_name = 'transportation-services' THEN 'Transportation Services'
  
  -- Care Services
  WHEN category_name = 'childcare-babysitting' THEN 'Childcare & Babysitting'
  WHEN category_name = 'elderly-care' THEN 'Elderly Care Services'
  WHEN category_name = 'veterinary-pet-care' THEN 'Veterinary & Pet Care'
  
  -- Lifestyle
  WHEN category_name = 'fashion-styling' THEN 'Fashion & Styling'
  WHEN category_name = 'sports-recreation' THEN 'Sports & Recreation'
  WHEN category_name = 'jewelry-accessories' THEN 'Jewelry & Accessories'
  WHEN category_name = 'travel-tour' THEN 'Travel & Tour Services'
  
  -- Business Services
  WHEN category_name = 'administration-business' THEN 'Administration & Business'
  WHEN category_name = 'customer-service' THEN 'Customer Service'
  WHEN category_name = 'realestate-services' THEN 'Real Estate Services'
  WHEN category_name = 'banking-financial' THEN 'Banking & Financial Services'
  WHEN category_name = 'printing-publishing' THEN 'Printing & Publishing'
  WHEN category_name = 'hospitality-tourism' THEN 'Hospitality & Tourism'
  WHEN category_name = 'Business & Consulting' THEN 'Business & Consulting'
  
  -- Specialized Services
  WHEN category_name = 'architecture-design' THEN 'Architecture & Design'
  WHEN category_name = 'engineering' THEN 'Engineering'
  WHEN category_name = 'construction-renovation' THEN 'Construction & Renovation'
  WHEN category_name = 'automotive' THEN 'Automotive'
  WHEN category_name = 'security-services' THEN 'Security Services'
  WHEN category_name = 'agriculture-farming' THEN 'Agriculture & Farming'
  WHEN category_name = 'advertising-media' THEN 'Advertising & Media'
  
  -- Keep existing proper names as they are
  ELSE category_name
END
WHERE category_name IS NOT NULL;

-- Clean up any empty or null category names by setting them to 'General Services'
UPDATE services 
SET category_name = 'General Services' 
WHERE category_name IS NULL OR TRIM(category_name) = '';

-- Add a comment to track this migration
COMMENT ON COLUMN services.category_name IS 'Service type/category name - now uses AI-suggested dynamic categories instead of hardcoded IDs. Updated to human-readable names.';

-- Show the results of the migration
SELECT DISTINCT category_name, COUNT(*) as service_count 
FROM services 
WHERE category_name IS NOT NULL 
GROUP BY category_name 
ORDER BY service_count DESC;
