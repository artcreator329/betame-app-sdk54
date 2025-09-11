/**
 * Network diagnostics utility for troubleshooting Supabase connectivity issues
 */

export interface NetworkDiagnosticResult {
  test: string;
  success: boolean;
  latency?: number;
  error?: string;
  details?: any;
}

export class NetworkDiagnostics {
  private static readonly SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  private static readonly SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  /**
   * Run comprehensive network diagnostics
   */
  static async runDiagnostics(): Promise<NetworkDiagnosticResult[]> {
    const results: NetworkDiagnosticResult[] = [];

    // Test 1: Basic internet connectivity
    results.push(await this.testInternetConnectivity());

    // Test 2: Supabase API connectivity
    results.push(await this.testSupabaseConnectivity());

    // Test 3: Supabase storage connectivity
    results.push(await this.testStorageConnectivity());

    // Test 4: DNS resolution
    results.push(await this.testDNSResolution());

    // Test 5: Network latency
    results.push(await this.testNetworkLatency());

    return results;
  }

  /**
   * Test basic internet connectivity
   */
  private static async testInternetConnectivity(): Promise<NetworkDiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      return {
        test: 'Internet Connectivity',
        success: response.ok,
        latency,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        test: 'Internet Connectivity',
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test Supabase API connectivity
   */
  private static async testSupabaseConnectivity(): Promise<NetworkDiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': this.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      // 401 is expected for HEAD request without proper auth
      const success = response.ok || response.status === 401;

      return {
        test: 'Supabase API Connectivity',
        success,
        latency,
        error: success ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        details: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        },
      };
    } catch (error) {
      return {
        test: 'Supabase API Connectivity',
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test Supabase storage connectivity
   */
  private static async testStorageConnectivity(): Promise<NetworkDiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.SUPABASE_URL}/storage/v1/bucket`, {
        method: 'GET',
        headers: {
          'apikey': this.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      return {
        test: 'Supabase Storage Connectivity',
        success: response.ok,
        latency,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        details: {
          status: response.status,
          contentType: response.headers.get('content-type'),
        },
      };
    } catch (error) {
      return {
        test: 'Supabase Storage Connectivity',
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test DNS resolution
   */
  private static async testDNSResolution(): Promise<NetworkDiagnosticResult> {
    const startTime = Date.now();
    
    try {
      // Extract hostname from Supabase URL
      const url = new URL(this.SUPABASE_URL);
      const hostname = url.hostname;

      // Simple DNS test by trying to connect
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`https://${hostname}`, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      return {
        test: 'DNS Resolution',
        success: true, // If we got any response, DNS worked
        latency,
        details: {
          hostname,
          resolved: true,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const isDNSError = error instanceof Error && 
        (error.message.includes('ENOTFOUND') || 
         error.message.includes('DNS') ||
         error.message.includes('getaddrinfo'));

      return {
        test: 'DNS Resolution',
        success: !isDNSError,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          isDNSError,
        },
      };
    }
  }

  /**
   * Test network latency with multiple pings
   */
  private static async testNetworkLatency(): Promise<NetworkDiagnosticResult> {
    const latencies: number[] = [];
    let errors = 0;

    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch(`${this.SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': this.SUPABASE_ANON_KEY,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        latencies.push(Date.now() - startTime);
      } catch (error) {
        errors++;
        latencies.push(Date.now() - startTime);
      }

      // Small delay between pings
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    return {
      test: 'Network Latency',
      success: errors < 3, // Success if at least one ping worked
      latency: avgLatency,
      error: errors === 3 ? 'All pings failed' : undefined,
      details: {
        pings: latencies.length,
        errors,
        avgLatency: Math.round(avgLatency),
        minLatency,
        maxLatency,
        jitter: Math.round(maxLatency - minLatency),
      },
    };
  }

  /**
   * Get network quality assessment
   */
  static assessNetworkQuality(results: NetworkDiagnosticResult[]): {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for failed tests
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      issues.push(`${failedTests.length} connectivity test(s) failed`);
    }

    // Check latency
    const latencyTest = results.find(r => r.test === 'Network Latency');
    if (latencyTest?.latency) {
      if (latencyTest.latency > 2000) {
        issues.push('High network latency detected');
        recommendations.push('Check your internet connection speed');
      } else if (latencyTest.latency > 1000) {
        issues.push('Moderate network latency detected');
      }
    }

    // Check for DNS issues
    const dnsTest = results.find(r => r.test === 'DNS Resolution');
    if (!dnsTest?.success && dnsTest?.details?.isDNSError) {
      issues.push('DNS resolution problems detected');
      recommendations.push('Try switching to a different DNS server (e.g., 8.8.8.8)');
    }

    // Check for storage connectivity
    const storageTest = results.find(r => r.test === 'Supabase Storage Connectivity');
    if (!storageTest?.success) {
      issues.push('Supabase storage connectivity issues');
      recommendations.push('Check Supabase project status and storage configuration');
    }

    // Determine overall quality
    let overall: 'excellent' | 'good' | 'fair' | 'poor';
    if (issues.length === 0) {
      overall = 'excellent';
    } else if (issues.length === 1 && !issues.some(i => i.includes('failed'))) {
      overall = 'good';
    } else if (failedTests.length <= 1) {
      overall = 'fair';
    } else {
      overall = 'poor';
    }

    // Add general recommendations
    if (issues.length > 0) {
      recommendations.push('Retry the operation in a few minutes');
      if (overall === 'poor') {
        recommendations.push('Contact support if issues persist');
      }
    }

    return { overall, issues, recommendations };
  }

  /**
   * Format diagnostic results for display
   */
  static formatResults(results: NetworkDiagnosticResult[]): string {
    let output = '🔍 Network Diagnostics Results:\n\n';

    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const latency = result.latency ? ` (${result.latency}ms)` : '';
      
      output += `${index + 1}. ${status} ${result.test}${latency}\n`;
      
      if (result.error) {
        output += `   Error: ${result.error}\n`;
      }
      
      if (result.details) {
        const details = Object.entries(result.details)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        output += `   Details: ${details}\n`;
      }
      
      output += '\n';
    });

    const assessment = this.assessNetworkQuality(results);
    output += `📊 Overall Network Quality: ${assessment.overall.toUpperCase()}\n\n`;

    if (assessment.issues.length > 0) {
      output += '⚠️ Issues Detected:\n';
      assessment.issues.forEach(issue => {
        output += `   • ${issue}\n`;
      });
      output += '\n';
    }

    if (assessment.recommendations.length > 0) {
      output += '💡 Recommendations:\n';
      assessment.recommendations.forEach(rec => {
        output += `   • ${rec}\n`;
      });
    }

    return output;
  }
}

export default NetworkDiagnostics;