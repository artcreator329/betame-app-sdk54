// Migration mapping from old categories to new service types
const categoryToServiceTypeMapping: { [key: string]: string } = {
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

// Helper function to migrate old category to new service type
function migrateCategoryToServiceType(oldCategory: string): string {
  const normalizedCategory = oldCategory.toLowerCase().replace(/\s+/g, '-');
  return categoryToServiceTypeMapping[normalizedCategory] || 'general';
}

// Helper function to get service type name by ID
function getServiceTypeName(serviceTypeId: string): string {
  const serviceCategories = [
    {
      id: 'personal-care',
      name: 'Personal Care & Wellness',
      services: [
        { id: 'beauty-cosmetics', name: 'Beauty & Cosmetics' },
        { id: 'fitness-training', name: 'Fitness & Personal Training' },
        { id: 'massage-wellness', name: 'Massage & Wellness' },
        { id: 'healthcare-medical', name: 'Healthcare & Medical Services' },
        { id: 'wellness-mental-health', name: 'Wellness & Mental Health' },
      ]
    },
    {
      id: 'home-living',
      name: 'Home & Living',
      services: [
        { id: 'cleaning-maintenance', name: 'Cleaning & Maintenance' },
        { id: 'repair-maintenance', name: 'Repair & Maintenance' },
        { id: 'gardening-landscaping', name: 'Gardening & Landscaping' },
        { id: 'interior-design', name: 'Interior Design' },
        { id: 'plumbing-electrical', name: 'Plumbing & Electrical' },
        { id: 'home-living', name: 'Home & Living' },
      ]
    },
    {
      id: 'professional',
      name: 'Professional Services',
      services: [
        { id: 'consulting-strategy', name: 'Consulting & Strategy' },
        { id: 'legal-services', name: 'Legal Services' },
        { id: 'accounting-finance', name: 'Accounting & Finance Services' },
        { id: 'marketing-advertising', name: 'Marketing & Advertising' },
        { id: 'hr', name: 'Human Resources' },
        { id: 'research-analysis', name: 'Research & Analysis' },
        { id: 'insurance-services', name: 'Insurance Services' },
      ]
    },
    {
      id: 'creative-media',
      name: 'Creative & Media',
      services: [
        { id: 'photography-videography', name: 'Photography & Videography' },
        { id: 'graphic-design', name: 'Graphic Design & Creative' },
        { id: 'music-audio', name: 'Music & Audio Production' },
        { id: 'social-media', name: 'Social Media Management' },
        { id: 'writing-content', name: 'Writing & Content Creation' },
        { id: 'arts-entertainment', name: 'Arts & Entertainment' },
      ]
    },
    {
      id: 'technology',
      name: 'Technology',
      services: [
        { id: 'digital-it', name: 'Digital & IT' },
        { id: 'programming-development', name: 'Programming & Development' },
        { id: 'technology-support', name: 'Technology Support' },
      ]
    },
    {
      id: 'events-entertainment',
      name: 'Events & Entertainment',
      services: [
        { id: 'event-planning', name: 'Event Planning & Management' },
        { id: 'cooking-catering', name: 'Cooking & Catering' },
        { id: 'gaming-streaming', name: 'Gaming & Streaming' },
        { id: 'wedding-services', name: 'Wedding Services' },
        { id: 'fnb', name: 'F&B' },
      ]
    },
    {
      id: 'education-training',
      name: 'Education & Training',
      services: [
        { id: 'education-training', name: 'Education & Training' },
        { id: 'tutoring-academic', name: 'Tutoring & Academic Support' },
        { id: 'language-translation', name: 'Language & Translation' },
      ]
    },
    {
      id: 'transportation-delivery',
      name: 'Transportation & Delivery',
      services: [
        { id: 'delivery-logistics', name: 'Delivery & Logistics' },
        { id: 'logistics-supply-chain', name: 'Logistics & Supply Chain' },
        { id: 'transportation-services', name: 'Transportation Services' },
      ]
    },
    {
      id: 'care-services',
      name: 'Care Services',
      services: [
        { id: 'childcare-babysitting', name: 'Childcare & Babysitting' },
        { id: 'elderly-care', name: 'Elderly Care Services' },
        { id: 'veterinary-pet-care', name: 'Veterinary & Pet Care' },
      ]
    },
    {
      id: 'lifestyle',
      name: 'Lifestyle',
      services: [
        { id: 'fashion-styling', name: 'Fashion & Styling' },
        { id: 'sports-recreation', name: 'Sports & Recreation' },
        { id: 'jewelry-accessories', name: 'Jewelry & Accessories' },
        { id: 'travel-tour', name: 'Travel & Tour Services' },
      ]
    },
    {
      id: 'business-services',
      name: 'Business Services',
      services: [
        { id: 'administration-business', name: 'Administration & Business' },
        { id: 'customer-service', name: 'Customer Service' },
        { id: 'realestate-services', name: 'Real Estate Services' },
        { id: 'banking-financial', name: 'Banking & Financial Services' },
        { id: 'printing-publishing', name: 'Printing & Publishing' },
        { id: 'hospitality-tourism', name: 'Hospitality & Tourism' },
      ]
    },
    {
      id: 'specialized',
      name: 'Specialized Services',
      services: [
        { id: 'architecture-design', name: 'Architecture & Design' },
        { id: 'engineering', name: 'Engineering' },
        { id: 'construction-renovation', name: 'Construction & Renovation' },
        { id: 'automotive', name: 'Automotive' },
        { id: 'security-services', name: 'Security Services' },
        { id: 'agriculture-farming', name: 'Agriculture & Farming' },
        { id: 'advertising-media', name: 'Advertising & Media' },
      ]
    }
  ];

  const allServices = serviceCategories.flatMap(category => category.services);
  const service = allServices.find(s => s.id === serviceTypeId);
  return service?.name || serviceTypeId;
}

module.exports = {
  categoryToServiceTypeMapping,
  migrateCategoryToServiceType,
  getServiceTypeName
};
