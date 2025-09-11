import { supabaseWithRetry } from './supabase';
import { NetworkDiagnostics } from './network-diagnostics';

export interface GeminiImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  imageData?: string; // Base64 encoded image data
}

export interface GeminiImageGenerationOptions {
  serviceTitle: string;
  serviceDescription: string;
  serviceCategory?: string;
  style?: 'professional' | 'creative' | 'minimalist' | 'vibrant';
}

export class GeminiImageService {
  private static readonly API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  private static readonly API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

  /**
   * Generate an image for a service based on its description
   */
  static async generateServiceImage(
    options: GeminiImageGenerationOptions
  ): Promise<GeminiImageGenerationResult> {
    return this.generateServiceImageWithRetry(options, 3);
  }

  /**
   * Generate service image with retry logic
   */
  private static async generateServiceImageWithRetry(
    options: GeminiImageGenerationOptions,
    maxRetries: number
  ): Promise<GeminiImageGenerationResult> {
    try {
      if (!this.API_KEY) {
        return {
          success: false,
          error: 'Gemini API key not configured'
        };
      }

      // Create a detailed prompt based on the service information
      const prompt = this.createServiceImagePrompt(options);

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🎨 Attempting AI image generation (attempt ${attempt}/${maxRetries}) for: ${options.serviceTitle}`);

          // Call Gemini API
          const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.API_KEY,
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt }
                ]
              }]
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error(`Gemini API error (attempt ${attempt}):`, errorData);
            
            // Parse error response for better error messages
            let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
            try {
              const parsedError = JSON.parse(errorData);
              if (parsedError.error && parsedError.error.message) {
                errorMessage = parsedError.error.message;
              }
            } catch (parseError) {
              // Use default error message if parsing fails
            }

            // Check if this is a retryable error
            const isRetryable = response.status === 500 || response.status === 502 || response.status === 503 || response.status === 429;
            
            if (isRetryable && attempt < maxRetries) {
              console.log(`⏳ Retryable error (${response.status}), waiting before retry...`);
              // Wait with exponential backoff
              const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue; // Try again
            }

            // Provide user-friendly error messages based on status code
            if (response.status === 500) {
              errorMessage = 'The AI image generation service is temporarily unavailable. Please try again in a few minutes.';
            } else if (response.status === 429) {
              errorMessage = 'Too many requests. Please wait a moment before trying again.';
            } else if (response.status === 403) {
              errorMessage = 'AI image generation service access denied. Please contact support.';
            } else if (response.status === 400) {
              errorMessage = 'Invalid request. Please try with different service details.';
            }

            return {
              success: false,
              error: errorMessage
            };
          }

          const data = await response.json();
          
          // Extract image data from response
          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const parts = data.candidates[0].content.parts;
            
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                const imageData = part.inlineData.data;
                
                console.log('✅ AI image generated successfully, uploading to storage...');
                
                // Upload the generated image to Supabase storage
                const uploadResult = await this.uploadGeneratedImage(imageData, options.serviceTitle);
                
                if (uploadResult.success) {
                  console.log('✅ AI image upload successful:', uploadResult.url);
                  return {
                    success: true,
                    imageUrl: uploadResult.url,
                    imageData: imageData
                  };
                } else {
                  return {
                    success: false,
                    error: uploadResult.error || 'Failed to upload generated image'
                  };
                }
              }
            }
          }

          // If we get here, no image data was found in the response
          if (attempt < maxRetries) {
            console.log(`⚠️ No image data received (attempt ${attempt}), retrying...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            continue;
          }

          return {
            success: false,
            error: 'No image data received from Gemini API after multiple attempts'
          };

        } catch (fetchError) {
          console.error(`Network error on attempt ${attempt}:`, fetchError);
          
          if (attempt < maxRetries) {
            console.log(`⏳ Network error, waiting before retry...`);
            const waitTime = Math.min(2000 * attempt, 10000); // Progressive wait time
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          return {
            success: false,
            error: fetchError instanceof Error ? fetchError.message : 'Network error occurred'
          };
        }
      }

      // This should never be reached, but just in case
      return {
        success: false,
        error: 'Maximum retry attempts exceeded'
      };

    } catch (error) {
      console.error('Error generating service image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create a detailed prompt for service image generation
   */
  private static createServiceImagePrompt(options: GeminiImageGenerationOptions): string {
    const { serviceTitle, serviceDescription, serviceCategory, style = 'professional' } = options;

    // Base prompt structure
    let prompt = `Create a high-quality, professional service card image for "${serviceTitle}". `;
    
    // Add service description context
    if (serviceDescription) {
      prompt += `Service description: "${serviceDescription}". `;
    }

    // Add category context
    if (serviceCategory) {
      prompt += `Service category: ${serviceCategory}. `;
    }

    // Add style instructions
    const styleInstructions = {
      professional: 'Use a clean, professional design with modern typography and subtle colors. Focus on trust and reliability.',
      creative: 'Use vibrant colors, creative layouts, and artistic elements. Make it eye-catching and innovative.',
      minimalist: 'Use minimal design with lots of white space, simple shapes, and clean typography. Focus on simplicity and elegance.',
      vibrant: 'Use bold, bright colors and dynamic compositions. Make it energetic and attention-grabbing.'
    };

    prompt += styleInstructions[style] + ' ';

    // Add aspect ratio and technical requirements (fixed to square for service cards)
    prompt += 'Create a square image (1:1 aspect ratio) suitable for service cards and social media. ';

    // Add final requirements
    prompt += `The image should be suitable for a service marketplace platform. Include relevant visual elements that represent the service type. Use high contrast and clear visual hierarchy. Avoid any text overlays as this will be added separately. The image should be 512x512 pixels for optimal performance and service card display.`;

    return prompt;
  }

  /**
   * Upload generated image to Supabase storage
   */
  private static async uploadGeneratedImage(
    base64Data: string,
    serviceTitle: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log('🔄 Starting AI image upload for:', serviceTitle);
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedTitle = serviceTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const fileName = `ai_generated_${sanitizedTitle}_${timestamp}.png`;
      const filePath = `ai-generated-images/${fileName}`;

      console.log('📁 Upload filename:', fileName);
      console.log('📁 Upload path:', filePath);

      // Check network connectivity first
      const networkCheck = await this.checkNetworkConnectivity();
      if (!networkCheck.connected) {
        console.error('❌ Network connectivity issue:', networkCheck.error);
        return {
          success: false,
          error: `Network connectivity issue: ${networkCheck.error}`
        };
      }

      // Convert base64 to ArrayBuffer with better error handling
      let arrayBuffer: ArrayBuffer;
      try {
        // Try using built-in atob first (more reliable)
        const binaryString = atob(base64Data);
        arrayBuffer = new ArrayBuffer(binaryString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }
      } catch (atobError) {
        console.log('⚠️ atob failed, trying base64-arraybuffer library...');
        try {
          const { decode } = await import('base64-arraybuffer');
          arrayBuffer = decode(base64Data);
        } catch (libraryError) {
          console.error('❌ Both base64 conversion methods failed:', { atobError, libraryError });
          return {
            success: false,
            error: 'Failed to convert base64 image data'
          };
        }
      }
      
      console.log('📊 Array buffer size:', arrayBuffer.byteLength, 'bytes');

      // Check if image is too large (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (arrayBuffer.byteLength > maxSize) {
        console.error('❌ Image too large:', arrayBuffer.byteLength, 'bytes (max:', maxSize, ')');
        return {
          success: false,
          error: `Image too large: ${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB (max 10MB)`
        };
      }

      // Verify storage bucket exists and is accessible
      const bucketCheck = await this.verifyStorageBucket();
      if (!bucketCheck.accessible) {
        console.error('❌ Storage bucket not accessible:', bucketCheck.error);
        return {
          success: false,
          error: `Storage bucket issue: ${bucketCheck.error}`
        };
      }

      console.log('🚀 Starting upload to Supabase storage...');

      // Upload with enhanced error handling - don't use Promise.race to avoid timeout conflicts
      const { data, error } = await supabaseWithRetry.storage
        .from('documents')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/png',
          upsert: false,
          // Add cache control for better performance
          cacheControl: '3600'
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        
        // Run network diagnostics for network-related errors
        if (error.message.includes('Network request failed') || 
            error.message.includes('network') || 
            error.message.includes('timeout')) {
          console.log('🔍 Running network diagnostics...');
          try {
            const diagnostics = await NetworkDiagnostics.runDiagnostics();
            const diagnosticReport = NetworkDiagnostics.formatResults(diagnostics);
            console.log(diagnosticReport);
          } catch (diagError) {
            console.error('❌ Failed to run network diagnostics:', diagError);
          }
        }
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (error.message.includes('already exists')) {
          errorMessage = 'File already exists. This should not happen with unique timestamps.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check storage bucket policies.';
        } else if (error.message.includes('quota')) {
          errorMessage = 'Storage quota exceeded. Please contact support.';
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log('✅ Upload successful, getting public URL...');

      // Get public URL with error handling
      const { data: urlData } = supabaseWithRetry.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        console.error('❌ Failed to generate public URL');
        return {
          success: false,
          error: 'Upload succeeded but failed to generate public URL'
        };
      }

      console.log('✅ Public URL generated:', urlData.publicUrl);

      return {
        success: true,
        url: urlData.publicUrl
      };

    } catch (error) {
      console.error('❌ Error uploading generated image:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Provide user-friendly error messages
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a stable internet connection.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error occurred. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check network connectivity to Supabase
   */
  private static async checkNetworkConnectivity(): Promise<{ connected: boolean; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (response.ok || response.status === 401) { // 401 is expected for HEAD request
        return { connected: true };
      } else {
        return { 
          connected: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Network check failed' 
      };
    }
  }

  /**
   * Verify storage bucket is accessible
   */
  private static async verifyStorageBucket(): Promise<{ accessible: boolean; error?: string }> {
    try {
      // Try to list files in the bucket (this will fail if bucket doesn't exist or no permissions)
      const { data, error } = await supabaseWithRetry.storage
        .from('documents')
        .list('ai-generated-images', { limit: 1 });

      if (error) {
        return { 
          accessible: false, 
          error: error.message 
        };
      }

      return { accessible: true };
    } catch (error) {
      return { 
        accessible: false, 
        error: error instanceof Error ? error.message : 'Bucket verification failed' 
      };
    }
  }

  /**
   * Get available image generation styles
   */
  static getAvailableStyles(): Array<{ value: string; label: string; description: string }> {
    return [
      {
        value: 'professional',
        label: 'Professional',
        description: 'Clean, modern design perfect for business services'
      },
      {
        value: 'creative',
        label: 'Creative',
        description: 'Vibrant and artistic, great for creative services'
      },
      {
        value: 'minimalist',
        label: 'Minimalist',
        description: 'Simple and elegant, focuses on essential elements'
      },
      {
        value: 'vibrant',
        label: 'Vibrant',
        description: 'Bold and energetic, perfect for dynamic services'
      }
    ];
  }

}

export default GeminiImageService;
