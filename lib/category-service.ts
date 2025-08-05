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
        .neq('category_name', 'General')
        .neq('category_name', 'general')
        .order('category_name');

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      // Get unique categories and map them with icons, excluding 'general' category
      const uniqueCategories = [...new Set(data.map(item => item.category_name))]
        .filter(categoryName => 
          categoryName.toLowerCase() !== 'general' && 
          categoryName.toLowerCase() !== 'other'
        );
      
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
    // Return empty string to remove colored emoji icons from homepage tabs
    return '';
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