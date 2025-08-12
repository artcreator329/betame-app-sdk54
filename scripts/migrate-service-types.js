// Simple migration script to update service categories
// This script maps old categories to new service types

const categoryToServiceTypeMapping = {
  // Personal Care & Wellness
  'beauty': 'beauty-cosmetics',
  'massage': 'massage-wellness',
  'healthcare': 'healthcare-medical',
  'wellness': 'wellness-mental-health',
  'fitness': 'fitness-training',

  // Home & Living
  'cleaning': 'cleaning-maintenance',
  'repair': 'repair-maintenance',
  'gardening': 'gardening-landscaping',
  'interior': 'interior-design',
  'plumbing': 'plumbing-electrical',
  'home': 'home-living',

  // Professional Services
  'consulting': 'consulting-strategy',
  'legal': 'legal-services',
  'accounting': 'accounting-finance',
  'marketing': 'marketing-advertising',
  'hr': 'hr',
  'research': 'research-analysis',
  'insurance': 'insurance-services',

  // Creative & Media
  'photography': 'photography-videography',
  'graphic': 'graphic-design',
  'music': 'music-audio',
  'social': 'social-media',
  'writing': 'writing-content',
  'arts': 'arts-entertainment',

  // Technology
  'digital': 'digital-it',
  'programming': 'programming-development',
  'technology': 'technology-support',

  // Events & Entertainment
  'event': 'event-planning',
  'cooking': 'cooking-catering',
  'gaming': 'gaming-streaming',
  'wedding': 'wedding-services',
  'fnb': 'fnb',

  // Education & Training
  'education': 'education-training',
  'tutoring': 'tutoring-academic',
  'language': 'language-translation',

  // Transportation & Delivery
  'delivery': 'delivery-logistics',
  'logistics': 'logistics-supply-chain',
  'transportation': 'transportation-services',

  // Care Services
  'childcare': 'childcare-babysitting',
  'elderly': 'elderly-care',
  'veterinary': 'veterinary-pet-care',

  // Lifestyle
  'fashion': 'fashion-styling',
  'sports': 'sports-recreation',
  'jewelry': 'jewelry-accessories',
  'travel': 'travel-tour',

  // Business Services
  'administration': 'administration-business',
  'customer': 'customer-service',
  'realestate': 'realestate-services',
  'banking': 'banking-financial',
  'printing': 'printing-publishing',
  'hospitality': 'hospitality-tourism',

  // Specialized Services
  'architecture': 'architecture-design',
  'engineering': 'engineering',
  'construction': 'construction-renovation',
  'automotive': 'automotive',
  'security': 'security-services',
  'agriculture': 'agriculture-farming',
  'advertising': 'advertising-media',
};

function migrateCategoryToServiceType(oldCategory) {
  const normalizedCategory = oldCategory.toLowerCase().replace(/\s+/g, '-');
  return categoryToServiceTypeMapping[normalizedCategory] || 'general';
}

console.log('Service Type Migration Mapping:');
console.log('==============================');

// Show the mapping
Object.entries(categoryToServiceTypeMapping).forEach(([oldCat, newType]) => {
  console.log(`${oldCat} -> ${newType}`);
});

console.log('\nTo apply this migration:');
console.log('1. Update your database services table');
console.log('2. Replace old category_name values with new service type IDs');
console.log('3. Update any hardcoded category references in your code');

console.log('\nExample SQL migration:');
console.log('UPDATE services SET category_name = CASE');
Object.entries(categoryToServiceTypeMapping).forEach(([oldCat, newType]) => {
  console.log(`  WHEN category_name = '${oldCat}' THEN '${newType}'`);
});
console.log(`  ELSE category_name END;`);
