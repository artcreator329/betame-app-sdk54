import { supabase } from './supabase';

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export class CategoryService {
  /**
   * Get all unique categories from services
   */
  static async getAllCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('category_name')
        .not('category_name', 'is', null)
        .order('category_name');

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      // Get unique categories and map them with icons
      const uniqueCategories = [...new Set(data.map(item => item.category_name))];
      
      return uniqueCategories.map((categoryName, index) => ({
        id: categoryName.toLowerCase().replace(/\s+/g, '-'),
        name: categoryName,
        icon: this.getCategoryIcon(categoryName)
      }));
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      return [];
    }
  }

  /**
   * Get icon for a category based on its name
   */
  private static getCategoryIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      'automotive': '🚗',
      'design': '🎨',
      'health & fitness': '💪',
      'home services': '🏠',
      'technology': '💻',
      'education': '🎓',
      'beauty': '💄',
      'cleaning': '🧹',
      'fitness': '💪',
      'sports': '⚽',
      'pet care': '🐕',
      'food': '🍽️',
      'photography': '📸',
      'music': '🎵',
      'art': '🎨',
      'writing': '✍️',
      'marketing': '📈',
      'business': '💼',
      'finance': '💰',
      'legal': '⚖️',
      'medical': '🏥',
      'construction': '🔨',
      'transportation': '🚚',
      'entertainment': '🎭',
      'travel': '✈️',
      'consulting': '💡',
      'repair': '🔧',
      'gardening': '🌱',
      'childcare': '👶',
      'elderly care': '👴',
      'tutoring': '📚',
      'language': '🗣️',
      'cooking': '👨‍🍳',
      'event planning': '🎉',
      'security': '🛡️',
      'delivery': '📦',
      'moving': '📦',
      'handyman': '🔨',
      'plumbing': '🚰',
      'electrical': '⚡',
      'painting': '🎨',
      'landscaping': '🌿',
      'veterinary': '🐾'
    };

    const key = categoryName.toLowerCase();
    return iconMap[key] || iconMap[Object.keys(iconMap).find(k => key.includes(k)) || ''] || '📋';
  }

  /**
   * Get services by category
   */
  static async getServicesByCategory(categoryName: string) {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('category_name', categoryName)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getServicesByCategory:', error);
      return [];
    }
  }
}