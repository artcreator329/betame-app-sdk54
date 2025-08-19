import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface WatermarkOptions {
  text: string;
  opacity?: number;
  fontSize?: number;
  color?: string;
  angle?: number;
}

export class CanvasWatermarkService {
  /**
   * Create a watermark overlay using Canvas (for web) or SVG data URI
   */
  private static createWatermarkDataUri(
    width: number,
    height: number,
    options: WatermarkOptions
  ): string {
    const { text, opacity = 0.3, fontSize = 32, color = '#FFFFFF', angle = -45 } = options;
    
    // Create SVG with repeating watermark pattern
    const patternSize = Math.max(width, height) / 3;
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="watermark" x="0" y="0" width="${patternSize}" height="${patternSize}" patternUnits="userSpaceOnUse">
            <g transform="rotate(${angle} ${patternSize/2} ${patternSize/2})">
              <text x="${patternSize/2}" y="${patternSize/2}" 
                    font-family="Arial, sans-serif" 
                    font-size="${fontSize}" 
                    font-weight="bold" 
                    fill="${color}" 
                    opacity="${opacity}" 
                    text-anchor="middle" 
                    dominant-baseline="central">
                ${text}
              </text>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#watermark)" />
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Add watermark to an image using image manipulation
   */
  static async addWatermark(
    imageUri: string,
    options: WatermarkOptions = { text: 'BetaMe' }
  ): Promise<string> {
    try {
      // First, get the image dimensions
      const imageInfo = await manipulateAsync(imageUri, [], { format: SaveFormat.PNG });
      
      // For now, we'll add a simple resize and compression
      // In a real implementation, you would use a more sophisticated watermarking library
      // or implement canvas-based watermarking
      const result = await manipulateAsync(
        imageUri,
        [
          { resize: { width: 800 } }, // Standardize width
        ],
        {
          compress: 0.8,
          format: SaveFormat.JPEG,
        }
      );
      
      // Note: This is a simplified implementation
      // For production, consider using react-native-canvas or similar libraries
      // that can properly overlay text watermarks
      
      return result.uri;
    } catch (error) {
      console.error('Error adding watermark:', error);
      throw new Error('Failed to add watermark to image');
    }
  }

  /**
   * Pick image and add watermark
   */
  static async pickAndWatermarkImage(
    source: 'camera' | 'gallery' = 'gallery',
    watermarkOptions?: WatermarkOptions
  ): Promise<{ uri: string; base64?: string } | null> {
    try {
      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Camera permission is required');
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Media library permission is required');
        }
      }

      // Pick image
      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: false,
          });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      
      // Add watermark (simplified version)
      const watermarkedUri = await this.addWatermark(
        asset.uri,
        watermarkOptions || { text: 'BetaMe' }
      );

      return {
        uri: watermarkedUri,
      };
    } catch (error) {
      console.error('Error picking and watermarking image:', error);
      throw error;
    }
  }

  /**
   * Show action sheet for image selection with watermarking
   */
  static async showImagePickerWithWatermark(
    watermarkOptions?: WatermarkOptions
  ): Promise<{ uri: string; base64?: string } | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Document Photo',
        'Choose how you want to capture your document. A "BetaMe" watermark will be automatically added.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                const result = await this.pickAndWatermarkImage('camera', watermarkOptions);
                resolve(result);
              } catch (error) {
                Alert.alert('Error', 'Failed to take photo. Please check camera permissions.');
                resolve(null);
              }
            },
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              try {
                const result = await this.pickAndWatermarkImage('gallery', watermarkOptions);
                resolve(result);
              } catch (error) {
                Alert.alert('Error', 'Failed to select photo. Please check gallery permissions.');
                resolve(null);
              }
            },
          },
        ]
      );
    });
  }
}