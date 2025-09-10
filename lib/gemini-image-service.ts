import { supabaseWithRetry } from './supabase';

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
    try {
      if (!this.API_KEY) {
        return {
          success: false,
          error: 'Gemini API key not configured'
        };
      }

      // Create a detailed prompt based on the service information
      const prompt = this.createServiceImagePrompt(options);

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
        console.error('Gemini API error:', errorData);
        return {
          success: false,
          error: `API request failed: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      
      // Extract image data from response
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const parts = data.candidates[0].content.parts;
        
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const imageData = part.inlineData.data;
            
            // Upload the generated image to Supabase storage
            const uploadResult = await this.uploadGeneratedImage(imageData, options.serviceTitle);
            
            if (uploadResult.success) {
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

      return {
        success: false,
        error: 'No image data received from Gemini API'
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
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedTitle = serviceTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const fileName = `ai_generated_${sanitizedTitle}_${timestamp}.png`;

      // Convert base64 to ArrayBuffer for React Native
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase storage using ArrayBuffer with retry logic
      const { data, error } = await supabaseWithRetry.storage
        .from('documents')
        .upload(`ai-generated-images/${fileName}`, bytes, {
          contentType: 'image/png',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Get public URL
      const { data: urlData } = supabaseWithRetry.storage
        .from('documents')
        .getPublicUrl(`ai-generated-images/${fileName}`);

      return {
        success: true,
        url: urlData.publicUrl
      };

    } catch (error) {
      console.error('Error uploading generated image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
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
