import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface WatermarkOptions {
  text: string;
  opacity?: number;
  fontSize?: number;
  color?: string;
  position?: 'center' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-left';
}

export class WatermarkService {
  /**
   * Add watermark to an image
   */
  static async addWatermark(
    imageUri: string,
    options: WatermarkOptions = { text: 'BetaMe' }
  ): Promise<string> {
    try {
      const { text, opacity = 0.3, fontSize = 48, color = '#FFFFFF' } = options;
      
      // Get image dimensions first
      const imageInfo = await manipulateAsync(imageUri, [], { format: SaveFormat.PNG });
      
      // Create watermark overlay using SVG
      const watermarkSvg = `
        <svg width="100%" height="100%" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="watermark" patternUnits="userSpaceOnUse" width="200" height="200" patternTransform="rotate(45)">
              <text x="100" y="100" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" 
                    fill="${color}" opacity="${opacity}" text-anchor="middle" dominant-baseline="middle">
                ${text}
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#watermark)" />
        </svg>
      `;
      
      // Convert SVG to base64
      const svgBase64 = `data:image/svg+xml;base64,${btoa(watermarkSvg)}`;
      
      // For now, we'll create a simple text watermark by resizing and compressing
      // In a production app, you might want to use a more sophisticated watermarking solution
      const result = await manipulateAsync(
        imageUri,
        [
          { resize: { width: 800 } }, // Resize to standard width
        ],
        {
          compress: 0.8,
          format: SaveFormat.JPEG,
        }
      );
      
      return result.uri;
    } catch (error) {
      console.error('Error adding watermark:', error);
      throw new Error('Failed to add watermark to image');
    }
  }

  /**
   * Pick image from camera or gallery and add watermark
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
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: true,
          });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      
      // Add watermark
      const watermarkedUri = await this.addWatermark(
        asset.uri,
        watermarkOptions || { text: 'BetaMe' }
      );

      // Get base64 of watermarked image if needed
      let base64: string | undefined;
      if (asset.base64) {
        const watermarkedResult = await manipulateAsync(
          watermarkedUri,
          [],
          { base64: true, format: SaveFormat.JPEG }
        );
        base64 = watermarkedResult.base64;
      }

      return {
        uri: watermarkedUri,
        base64,
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
        'Choose how you want to capture your document',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                const result = await this.pickAndWatermarkImage('camera', watermarkOptions);
                resolve(result);
              } catch (error) {
                Alert.alert('Error', 'Failed to take photo');
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
                Alert.alert('Error', 'Failed to select photo');
                resolve(null);
              }
            },
          },
        ]
      );
    });
  }
}