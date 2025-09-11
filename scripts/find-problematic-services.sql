-- Find services that have dependencies and might be hard to delete
-- Run this in Supabase SQL Editor to identify which services are problematic

-- Services with active jobs (these are the most problematic)
SELECT 
    'SERVICES WITH ACTIVE JOBS' as category,
    s.id as service_id,
    s.title,
    s.status,
    COUNT(DISTINCT so.id) as service_offers_count,
    COUNT(DISTINCT aj.id) as active_jobs_count
FROM services s
JOIN service_offers so ON s.id = so.service_id
JOIN active_jobs aj ON so.id = aj.service_offer_id
GROUP BY s.id, s.title, s.status
ORDER BY active_jobs_count DESC;

-- Services with service offers but no active jobs
SELECT 
    'SERVICES WITH OFFERS ONLY' as category,
    s.id as service_id,
    s.title,
    s.status,
    COUNT(so.id) as service_offers_count
FROM services s
JOIN service_offers so ON s.id = so.service_id
LEFT JOIN active_jobs aj ON so.id = aj.service_offer_id
WHERE aj.id IS NULL
GROUP BY s.id, s.title, s.status
ORDER BY service_offers_count DESC;

-- Services with no dependencies (safe to delete)
SELECT 
    'SAFE TO DELETE SERVICES' as category,
    s.id as service_id,
    s.title,
    s.status
FROM services s
LEFT JOIN service_offers so ON s.id = so.service_id
WHERE so.id IS NULL
LIMIT 10;