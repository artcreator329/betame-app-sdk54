import { Image } from 'expo-image';
import { IMAGE_OPTIMIZATION_CONFIG, getOptimizedImageUrl } from '@/config/image-optimization';

export class ImageCacheService {
  private static instance: ImageCacheService;
  private cache: Map<string, boolean> = new Map();
  private preloadQueue: string[] = [];
  private isPreloading = false;

  static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(urls: string[]): Promise<void> {
    if (this.isPreloading) {
      // Add to queue if already preloading
      this.preloadQueue.push(...urls);
      return;
    }

    this.isPreloading = true;
    
    try {
      const validUrls = urls.filter(url => url && !this.cache.has(url));
      
      if (validUrls.length === 0) {
        return;
      }

      console.log(`🖼️ Preloading ${validUrls.length} images...`);
      
      // Preload images in batches to avoid overwhelming the system
      const batchSize = IMAGE_OPTIMIZATION_CONFIG.preload.batchSize;
      for (let i = 0; i < validUrls.length; i += batchSize) {
        const batch = validUrls.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (url) => {
            try {
              await Image.prefetch(url);
              this.cache.set(url, true);
            } catch (error) {
              console.warn(`Failed to preload image: ${url}`, error);
            }
          })
        );

        // Small delay between batches to prevent blocking
        if (i + batchSize < validUrls.length) {
          await new Promise(resolve => setTimeout(resolve, IMAGE_OPTIMIZATION_CONFIG.preload.delay));
        }
      }

      console.log(`✅ Preloaded ${validUrls.length} images successfully`);
    } catch (error) {
      console.error('Error preloading images:', error);
    } finally {
      this.isPreloading = false;
      
      // Process queued images
      if (this.preloadQueue.length > 0) {
        const queuedUrls = [...this.preloadQueue];
        this.preloadQueue = [];
        await this.preloadImages(queuedUrls);
      }
    }
  }

  /**
   * Clear image cache
   */
  clearCache(): void {
    this.cache.clear();
    Image.clearMemoryCache();
    console.log('🧹 Image cache cleared');
  }

  /**
   * Check if image is cached
   */
  isCached(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * Get optimized image URL with size parameters
   */
  getOptimizedUrl(url: string, width?: number, height?: number): string {
    if (!url) return url;

    // If it's a Supabase storage URL, we can add transformation parameters
    if (url.includes('supabase.co') && url.includes('/storage/')) {
      const baseUrl = url.split('?')[0];
      const params = new URLSearchParams();
      
      if (width) params.append('width', width.toString());
      if (height) params.append('height', height.toString());
      params.append('quality', '80'); // Reduce quality for faster loading
      params.append('format', IMAGE_OPTIMIZATION_CONFIG.formats.preferred);
      
      return `${baseUrl}?${params.toString()}`;
    }

    return url;
  }

  /**
   * Get thumbnail URL for faster loading
   */
  getThumbnailUrl(url: string): string {
    return getOptimizedImageUrl(url, 'thumbnail');
  }

  /**
   * Get medium size URL for service cards
   */
  getMediumUrl(url: string): string {
    return getOptimizedImageUrl(url, 'medium');
  }

  /**
   * Get full size URL for detailed views
   */
  getFullSizeUrl(url: string): string {
    return getOptimizedImageUrl(url, 'full');
  }
}

export const imageCacheService = ImageCacheService.getInstance();
