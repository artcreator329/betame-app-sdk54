export const IMAGE_OPTIMIZATION_CONFIG = {
  // Thumbnail sizes for different use cases
  sizes: {
    thumbnail: { width: 150, height: 150 },
    small: { width: 200, height: 200 },
    medium: { width: 300, height: 200 },
    large: { width: 400, height: 300 },
    full: { width: 800, height: 600 },
  },

  // Quality settings
  quality: {
    thumbnail: 70,
    small: 75,
    medium: 80,
    large: 85,
    full: 90,
  },

  // Cache settings
  cache: {
    memory: true,
    disk: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Preload settings
  preload: {
    batchSize: 5,
    delay: 100, // ms between batches
  },

  // Placeholder settings
  placeholders: {
    service: 'https://via.placeholder.com/300x200?text=Service+Image',
    profile: 'https://via.placeholder.com/150x150?text=Profile',
    cover: 'https://via.placeholder.com/400x200?text=Cover+Photo',
  },

  // Format preferences
  formats: {
    preferred: 'webp',
    fallback: 'jpeg',
  },
};

export const getOptimizedImageUrl = (
  originalUrl: string,
  size: keyof typeof IMAGE_OPTIMIZATION_CONFIG.sizes,
  format?: string
): string => {
  if (!originalUrl) return originalUrl;

  // For Supabase storage URLs, add transformation parameters
  if (originalUrl.includes('supabase.co') && originalUrl.includes('/storage/')) {
    const baseUrl = originalUrl.split('?')[0];
    const params = new URLSearchParams();
    
    const sizeConfig = IMAGE_OPTIMIZATION_CONFIG.sizes[size];
    params.append('width', sizeConfig.width.toString());
    params.append('height', sizeConfig.height.toString());
    params.append('quality', IMAGE_OPTIMIZATION_CONFIG.quality[size].toString());
    params.append('format', format || IMAGE_OPTIMIZATION_CONFIG.formats.preferred);
    
    return `${baseUrl}?${params.toString()}`;
  }

  return originalUrl;
};
