-- Script to check all dependencies for a service before deletion
-- Replace 'YOUR_SERVICE_ID' with the actual service ID you want to check

-- Check service details
SELECT 
    'SERVICE DETAILS' as section,
    id,
    title,
    user_id,
    status,
    created_at
FROM services 
WHERE id = 'YOUR_SERVICE_ID';

-- Check service offers that reference this service
SELECT 
    'SERVICE OFFERS' as section,
    so.id as offer_id,
    so.status as offer_status,
    so.created_at as offer_created,
    so.buyer_id,
    so.seller_id,
    p1.full_name as buyer_name,
    p2.full_name as seller_name
FROM service_offers so
LEFT JOIN profiles p1 ON so.buyer_id = p1.id
LEFT JOIN profiles p2 ON so.seller_id = p2.id
WHERE so.service_id = 'YOUR_SERVICE_ID'
ORDER BY so.created_at DESC;

-- Check active jobs that depend on service offers
SELECT 
    'ACTIVE JOBS' as section,
    aj.id as job_id,
    aj.title,
    aj.status,
    aj.created_at,
    so.id as service_offer_id
FROM active_jobs aj
JOIN service_offers so ON aj.service_offer_id = so.id
WHERE so.service_id = 'YOUR_SERVICE_ID';

-- Check job status records
SELECT 
    'JOB STATUS' as section,
    js.id as job_status_id,
    js.current_status,
    js.created_at,
    so.id as service_offer_id
FROM job_status js
JOIN service_offers so ON js.service_offer_id = so.id
WHERE so.service_id = 'YOUR_SERVICE_ID';

-- Check escrow transactions
SELECT 
    'ESCROW TRANSACTIONS' as section,
    et.id as escrow_id,
    et.status,
    et.amount,
    et.created_at,
    so.id as service_offer_id
FROM escrow_transactions et
JOIN service_offers so ON et.service_offer_id = so.id
WHERE so.service_id = 'YOUR_SERVICE_ID';

-- Check service variants (child services)
SELECT 
    'SERVICE VARIANTS' as section,
    id,
    title,
    status,
    created_at
FROM services 
WHERE parent_service_id = 'YOUR_SERVICE_ID';

-- Check chats
SELECT 
    'CHATS' as section,
    c.id as chat_id,
    c.service_title,
    c.created_at
FROM chats c
WHERE c.service_id = 'YOUR_SERVICE_ID';

-- Check service views
SELECT 
    'SERVICE VIEWS' as section,
    COUNT(*) as total_views
FROM service_views sv
WHERE sv.service_id = 'YOUR_SERVICE_ID';

-- Check favorites
SELECT 
    'FAVORITES' as section,
    COUNT(*) as total_favorites
FROM favorites f
WHERE f.service_id = 'YOUR_SERVICE_ID';

-- Check service analytics
SELECT 
    'SERVICE ANALYTICS' as section,
    COUNT(*) as total_analytics_records
FROM service_analytics sa
WHERE sa.service_id = 'YOUR_SERVICE_ID';

-- Check service feature applications
SELECT 
    'SERVICE FEATURES' as section,
    COUNT(*) as total_feature_applications
FROM service_feature_applications sfa
WHERE sfa.service_id = 'YOUR_SERVICE_ID';

-- Check service locations
SELECT 
    'SERVICE LOCATIONS' as section,
    COUNT(*) as total_location_records
FROM service_locations sl
WHERE sl.service_id = 'YOUR_SERVICE_ID';