import { supabase } from './supabase';
import { authService } from './auth-service';
import { adminService } from './admin-service';

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
  static async uploadDocument(file: File | string, fileName: string, userId: string): Promise<string> {
    try {
      let fileToUpload: File | Blob;
      
      // Handle React Native local URI or web File
      if (typeof file === 'string') {
        // For React Native, fetch the local file
        const response = await fetch(file);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        fileToUpload = await response.blob();
      } else {
        fileToUpload = file;
      }

      const fileExt = fileName.split('.').pop() || 'jpg';
      const filePath = `ekyc-documents/${userId}/${Date.now()}.${fileExt}`;

      console.log('📤 Uploading document to:', filePath);

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, fileToUpload, {
          contentType: fileToUpload instanceof Blob ? fileToUpload.type : 'image/jpeg'
        });

      if (error) {
        console.error('Error uploading document:', error);
        throw new Error(`Failed to upload document: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      console.log('✅ Document uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadDocument:', error);
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
      
      const { data, error } = await supabase
        .from('ekyc_submissions')
        .select(`
          *,
          user_profiles(full_name, avatar_url)
        `)
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
      const { error } = await supabase
        .from('user_profiles')
        .update({ verification_status: status })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user verification status:', error);
        throw new Error(`Failed to update verification status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in updateUserVerificationStatus:', error);
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
}