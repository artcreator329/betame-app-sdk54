import { supabase, supabaseAdmin } from './supabase';
import { authService } from './auth-service';
import { adminService } from './admin-service';
import * as FileSystem from 'expo-file-system';

export interface EKYCSubmission {
  id?: string;
  user_id: string;
  nationality: 'Malaysian' | 'Foreigner';
  full_name: string;
  ic_number?: string;
  passport_number?: string;
  country?: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  address_type: 'Current Address' | 'Registered Address';
  address: string;
  city: string;
  postcode: string;
  state: string;
  identity_document_url?: string;
  proof_of_address_url?: string;
  additional_document_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EKYCDocumentUpload {
  file: File | string; // File object or base64 string
  type: 'identity' | 'address' | 'additional';
  fileName: string;
}

export class EKYCService {
  /**
   * Upload document to Supabase storage
   */
  static async uploadDocument(fileUri: string, fileName: string, userId: string): Promise<string> {
    try {
      console.log('📤 Starting document upload for:', fileName);
      console.log('📤 File URI:', fileUri);
      console.log('📤 User ID:', userId);

      // Read the file as base64 using expo-file-system
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      });

      console.log('📤 Base64 data length:', base64Data.length);
      
      if (!base64Data || base64Data.length === 0) {
        throw new Error('File is empty or could not be read');
      }

      // Convert base64 to array buffer using the same method as ImageService
      const { decode } = await import('base64-arraybuffer');
      const arrayBuffer = decode(base64Data);

      console.log('📤 Array buffer size:', arrayBuffer.byteLength);

      // Generate file path
      const fileExt = fileName.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const filePath = `ekyc-documents/${userId}/${timestamp}.${fileExt}`;

      console.log('📤 Uploading to path:', filePath);

      // Map file extensions to proper MIME types
      const getMimeType = (extension: string): string => {
        const mimeTypes: { [key: string]: string } = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'bmp': 'image/bmp',
          'tiff': 'image/tiff',
          'tif': 'image/tiff'
        };
        return mimeTypes[extension] || 'image/jpeg';
      };

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, arrayBuffer, {
          contentType: getMimeType(fileExt),
          upsert: false
        });

      if (error) {
        console.error('❌ Upload error:', error);
        throw new Error(`Failed to upload document: ${error.message}`);
      }

      console.log('✅ Document uploaded successfully:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      console.log('✅ Public URL generated:', urlData.publicUrl);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Error in uploadDocument:', error);
      throw error;
    }
  }

  /**
   * Submit eKYC application
   */
  static async submitEKYC(submission: any): Promise<EKYCSubmission> {
    try {
      console.log('🔍 EKYCService: Starting submission process...');
      const user = await authService.getCurrentUser();
      console.log('🔍 EKYCService: User from authService:', user);
      
      if (!user) {
        console.error('❌ EKYCService: User not authenticated');
        throw new Error('User not authenticated');
      }
      
      console.log('✅ EKYCService: User authenticated:', user.id);

      // Map document URLs from the frontend format to database format
        const documentUrls = submission.document_urls || {};
        
        const submissionData: Omit<EKYCSubmission, 'id' | 'created_at' | 'updated_at'> = {
          user_id: user.id,
          nationality: submission.nationality,
          full_name: submission.full_name,
          ic_number: submission.ic_number,
          passport_number: submission.passport_number,
          country: submission.country,
          date_of_birth: submission.date_of_birth,
          phone_number: submission.phone_number,
          email: submission.email,
          address_type: submission.address_type,
          address: submission.address,
          city: submission.city,
          postcode: submission.postcode,
          state: submission.state,
          identity_document_url: documentUrls.ic_front || documentUrls.ic || documentUrls.passport,
          proof_of_address_url: documentUrls.ic_back || documentUrls.address || documentUrls.proof_of_address,
          additional_document_url: documentUrls.selfie || documentUrls.bank_statement || documentUrls.additional,
          status: 'pending'
        };

      console.log('📤 EKYCService: Submitting eKYC data:', submissionData);

      const { data, error } = await supabase
        .from('ekyc_submissions')
        .insert([submissionData])
        .select()
        .single();

      if (error) {
        console.error('❌ EKYCService: Error submitting eKYC:', error);
        console.error('❌ EKYCService: Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Failed to submit eKYC: ${error.message}`);
      }

      console.log('✅ eKYC submission successful:', data);

      // Update user profile verification status
      await this.updateUserVerificationStatus(user.id, 'in_progress');

      // Send notification to all admins about new eKYC submission
      try {
        const userProfile = await authService.getUserProfile(user.id);
        const userName = userProfile?.full_name || userProfile?.email || 'Unknown User';
        
        await adminService.sendEKYCNotificationToAdmins({
          userId: user.id,
          userName: userName,
          submissionId: data.id
        });
        
        console.log('✅ Admin notification sent for eKYC submission:', data.id);
      } catch (notificationError) {
        // Don't fail the submission if notification fails
        console.error('⚠️ Failed to send admin notification for eKYC submission:', notificationError);
      }

      return data;
    } catch (error) {
      console.error('Error in submitEKYC:', error);
      throw error;
    }
  }

  /**
   * Get user's eKYC submission
   */
  static async getUserEKYCSubmission(): Promise<EKYCSubmission | null> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('ekyc_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error fetching eKYC submission:', error);
        throw new Error(`Failed to fetch eKYC submission: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Error in getUserEKYCSubmission:', error);
      return null;
    }
  }

  /**
   * Get all eKYC submissions (admin only)
   */
  static async getAllEKYCSubmissions(): Promise<EKYCSubmission[]> {
    try {
      console.log('🔍 EKYCService: Fetching all eKYC submissions...');
      
      // Check if current user is authenticated
      const user = await authService.getCurrentUser();
      if (!user) {
        console.error('❌ EKYCService: User not authenticated');
        throw new Error('User not authenticated');
      }
      
      console.log('🔍 EKYCService: User authenticated:', user.id);
      
      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabase
        .rpc('is_user_admin', { input_user_id: user.id });
      
      if (adminError) {
        console.error('❌ EKYCService: Error checking admin status:', adminError);
        throw new Error('Failed to verify admin access');
      }
      
      if (!adminCheck) {
        console.error('❌ EKYCService: User is not admin');
        throw new Error('Access denied: Admin privileges required');
      }
      
      console.log('✅ EKYCService: Admin access verified');
      
      const { data, error } = await supabase
        .from('ekyc_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all eKYC submissions:', error);
        throw new Error(`Failed to fetch eKYC submissions: ${error.message}`);
      }

      console.log('✅ EKYCService: Found submissions:', data?.length || 0);
      console.log('📋 EKYCService: Submissions:', data);
      
      return data || [];
    } catch (error) {
      console.error('❌ Error in getAllEKYCSubmissions:', error);
      throw error;
    }
  }

  /**
   * Update eKYC submission status (admin only)
   */
  static async updateEKYCStatus(
    submissionId: string, 
    status: 'approved' | 'rejected', 
    adminNotes?: string
  ): Promise<EKYCSubmission> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabase
        .rpc('is_user_admin', { input_user_id: user.id });
      
      if (adminError) {
        console.error('❌ EKYCService: Error checking admin status:', adminError);
        throw new Error('Failed to verify admin access');
      }
      
      if (!adminCheck) {
        console.error('❌ EKYCService: User is not admin');
        throw new Error('Access denied: Admin privileges required');
      }
      
      console.log('✅ EKYCService: Admin access verified for status update');

      const updateData = {
        status,
        admin_notes: adminNotes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('ekyc_submissions')
        .update(updateData)
        .eq('id', submissionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating eKYC status:', error);
        throw new Error(`Failed to update eKYC status: ${error.message}`);
      }

      // Update user profile verification status
      const verificationStatus = status === 'approved' ? 'verified' : 'rejected';
      await this.updateUserVerificationStatus(data.user_id, verificationStatus);

      return data;
    } catch (error) {
      console.error('Error in updateEKYCStatus:', error);
      throw error;
    }
  }

  /**
   * Update user verification status in profile
   */
  private static async updateUserVerificationStatus(
    userId: string, 
    status: 'not_started' | 'in_progress' | 'verified' | 'rejected'
  ): Promise<void> {
    try {
      console.log('🔧 EKYCService: Updating user verification status:', { userId, status });
      
      // Use supabaseAdmin to bypass RLS policies for admin operations
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .update({ 
          verification_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error updating user verification status:', error);
        throw new Error(`Failed to update verification status: ${error.message}`);
      }
      
      console.log('✅ EKYCService: User verification status updated successfully');
    } catch (error) {
      console.error('❌ Error in updateUserVerificationStatus:', error);
      throw error;
    }
  }

  /**
   * Get user verification status
   */
  static async getUserVerificationStatus(): Promise<string> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        return 'not_started';
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('verification_status')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching verification status:', error);
        return 'not_started';
      }

      return data?.verification_status || 'not_started';
    } catch (error) {
      console.error('Error in getUserVerificationStatus:', error);
      return 'not_started';
    }
  }

  /**
   * Check if user is verified service provider
   */
  static async isVerifiedServiceProvider(): Promise<boolean> {
    try {
      const status = await this.getUserVerificationStatus();
      return status === 'verified';
    } catch (error) {
      console.error('Error checking verified service provider status:', error);
      return false;
    }
  }

  /**
   * Fix users with approved eKYC but incorrect verification status
   * This is a one-time fix for users affected by the RLS policy issue
   */
  static async fixVerificationStatusMismatch(): Promise<{ fixed: number; errors: number }> {
    try {
      console.log('🔧 EKYCService: Starting verification status mismatch fix...');
      
      // Find users with approved eKYC but incorrect verification status
      const { data: mismatchedUsers, error } = await supabaseAdmin
        .from('ekyc_submissions')
        .select(`
          user_id,
          status,
          reviewed_at,
          user_profiles!inner(verification_status)
        `)
        .eq('status', 'approved')
        .neq('user_profiles.verification_status', 'verified')
        .not('reviewed_at', 'is', null);

      if (error) {
        console.error('❌ Error finding mismatched users:', error);
        throw new Error(`Failed to find mismatched users: ${error.message}`);
      }

      console.log(`🔧 EKYCService: Found ${mismatchedUsers?.length || 0} users with mismatched status`);

      let fixed = 0;
      let errors = 0;

      if (mismatchedUsers && mismatchedUsers.length > 0) {
        for (const user of mismatchedUsers) {
          try {
            await this.updateUserVerificationStatus(user.user_id, 'verified');
            fixed++;
            console.log(`✅ Fixed user ${user.user_id}`);
          } catch (updateError) {
            console.error(`❌ Failed to fix user ${user.user_id}:`, updateError);
            errors++;
          }
        }
      }

      console.log(`✅ EKYCService: Verification status fix completed. Fixed: ${fixed}, Errors: ${errors}`);
      return { fixed, errors };
    } catch (error) {
      console.error('❌ Error in fixVerificationStatusMismatch:', error);
      throw error;
    }
  }
}