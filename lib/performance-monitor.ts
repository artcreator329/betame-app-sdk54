interface PerformanceMetrics {
  imageLoadTime: number;
  imageSize: number;
  cacheHit: boolean;
  url: string;
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private isEnabled = __DEV__; // Only enable in development

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Track image loading performance
   */
  trackImageLoad(url: string, loadTime: number, imageSize: number, cacheHit: boolean): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetrics = {
      imageLoadTime: loadTime,
      imageSize,
      cacheHit,
      url,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Keep only last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log slow image loads
    if (loadTime > 2000) {
      console.warn(`🐌 Slow image load: ${url} took ${loadTime}ms`);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalImages: number;
    averageLoadTime: number;
    cacheHitRate: number;
    slowImages: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalImages: 0,
        averageLoadTime: 0,
        cacheHitRate: 0,
        slowImages: 0,
      };
    }

    const totalImages = this.metrics.length;
    const averageLoadTime = this.metrics.reduce((sum, m) => sum + m.imageLoadTime, 0) / totalImages;
    const cacheHitRate = this.metrics.filter(m => m.cacheHit).length / totalImages;
    const slowImages = this.metrics.filter(m => m.imageLoadTime > 2000).length;

    return {
      totalImages,
      averageLoadTime: Math.round(averageLoadTime),
      cacheHitRate: Math.round(cacheHitRate * 100),
      slowImages,
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Log performance report
   */
  logReport(): void {
    if (!this.isEnabled) return;

    const stats = this.getStats();
    console.log('📊 Image Performance Report:', stats);
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
