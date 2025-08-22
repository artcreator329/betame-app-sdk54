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
        
        // Format date from DD/MM/YYYY to YYYY-MM-DD for database
        const formatDateForDatabase = (dateString: string): string => {
          if (!dateString) return '';
          
          // Handle DD/MM/YYYY format
          const parts = dateString.split('/');
          if (parts.length === 3) {
            const day = parts[0];
            const month = parts[1];
            const year = parts[2];
            // Convert DD/MM/YYYY to YYYY-MM-DD
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          
          // If already in YYYY-MM-DD format, return as is
          if (dateString.includes('-') && dateString.length === 10) {
            return dateString;
          }
          
          // Try to parse as Date object
          try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn('Could not parse date:', dateString);
          }
          
          return dateString; // Return original if all else fails
        };
        
        const submissionData: Omit<EKYCSubmission, 'id' | 'created_at' | 'updated_at'> = {
          user_id: user.id,
          nationality: submission.nationality,
          full_name: submission.full_name,
          ic_number: submission.ic_number,
          passport_number: submission.passport_number,
          country: submission.country,
          date_of_birth: formatDateForDatabase(submission.date_of_birth),
          phone_number: submission.phone_number,
          email: submission.email,
          address_type: submission.address_type,
          address: submission.address,
          city: submission.city,
          postcode: submission.postcode,
          state: submission.state,
          identity_document_url: documentUrls.ic_front || documentUrls.ic || documentUrls.passport,
          proof_of_address_url: documentUrls.ic_back || documentUrls.address || documentUrls.proof_of_address,
          additional_document_url: documentUrls.selfie || documentUrls.additional,
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
   * Update user verification status in profile with enhanced error handling and monitoring
   */
  private static async updateUserVerificationStatus(
    userId: string, 
    status: 'not_started' | 'in_progress' | 'verified' | 'rejected',
    retryCount: number = 0
  ): Promise<void> {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    try {
      console.log('🔧 EKYCService: Updating user verification status:', { 
        userId, 
        status, 
        attempt: retryCount + 1,
        maxRetries: maxRetries + 1
      });
      
      // First, verify the user exists
      const { data: userExists, error: userCheckError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, verification_status, full_name')
        .eq('user_id', userId)
        .single();

      if (userCheckError) {
        console.error('❌ Error checking user existence:', userCheckError);
        throw new Error(`User not found: ${userCheckError.message}`);
      }

      const currentStatus = userExists.verification_status;
      console.log('📊 Current verification status:', currentStatus, '→ New status:', status);

      // Skip update if status is already correct
      if (currentStatus === status) {
        console.log('✅ Status already correct, skipping update');
        return;
      }

      // Use supabaseAdmin to bypass RLS policies for admin operations
      const { data: updateResult, error } = await supabaseAdmin
        .from('user_profiles')
        .update({ 
          verification_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select('verification_status, updated_at');

      if (error) {
        console.error('❌ Error updating user verification status:', error);
        
        // Retry logic for transient errors
        if (retryCount < maxRetries && this.isRetryableError(error)) {
          console.log(`🔄 Retrying update in ${retryDelay}ms... (attempt ${retryCount + 2}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.updateUserVerificationStatus(userId, status, retryCount + 1);
        }
        
        throw new Error(`Failed to update verification status: ${error.message}`);
      }
      
      console.log('✅ EKYCService: User verification status updated successfully:', updateResult);

      // Log the sync operation for monitoring
      try {
        await this.logSyncOperation(userId, currentStatus, status, 'service_update');
      } catch (logError) {
        console.warn('⚠️ Failed to log sync operation:', logError);
        // Don't fail the main operation if logging fails
      }

    } catch (error) {
      console.error('❌ Error in updateUserVerificationStatus:', error);
      
      // Log the failure for monitoring
      try {
        await this.logSyncFailure(userId, status, error.message);
      } catch (logError) {
        console.warn('⚠️ Failed to log sync failure:', logError);
      }
      
      throw error;
    }
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: any): boolean {
    const retryableCodes = ['PGRST301', 'PGRST302', '23505']; // Connection issues, conflicts
    return retryableCodes.includes(error.code) || 
           error.message?.includes('timeout') ||
           error.message?.includes('connection');
  }

  /**
   * Log sync operation for monitoring
   */
  private static async logSyncOperation(
    userId: string, 
    oldStatus: string, 
    newStatus: string, 
    source: string
  ): Promise<void> {
    try {
      const { data: userInfo } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);

      await supabaseAdmin
        .from('ekyc_sync_log')
        .insert({
          user_id: userId,
          user_email: authUser.user?.email || 'unknown',
          user_name: userInfo?.full_name || 'unknown',
          old_ekyc_status: oldStatus,
          new_ekyc_status: newStatus,
          new_verification_status: newStatus,
          trigger_source: source
        });
    } catch (error) {
      console.warn('⚠️ Failed to log sync operation:', error);
    }
  }

  /**
   * Log sync failure for monitoring
   */
  private static async logSyncFailure(
    userId: string, 
    attemptedStatus: string, 
    errorMessage: string
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('ekyc_sync_log')
        .insert({
          user_id: userId,
          user_email: 'unknown',
          user_name: 'unknown',
          old_ekyc_status: 'unknown',
          new_ekyc_status: attemptedStatus,
          new_verification_status: 'failed',
          trigger_source: 'service_update_failed',
          sync_timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.warn('⚠️ Failed to log sync failure:', error);
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

  /**
   * Get eKYC sync statistics
   */
  static async getSyncStatistics(): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_ekyc_sync_stats');

      if (error) {
        console.error('❌ Error getting sync statistics:', error);
        throw new Error(`Failed to get sync statistics: ${error.message}`);
      }

      return data?.[0] || {};
    } catch (error) {
      console.error('❌ Error in getSyncStatistics:', error);
      throw error;
    }
  }

  /**
   * Check for sync mismatches
   */
  static async checkSyncMismatches(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('check_ekyc_profile_sync_mismatches');

      if (error) {
        console.error('❌ Error checking sync mismatches:', error);
        throw new Error(`Failed to check sync mismatches: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in checkSyncMismatches:', error);
      throw error;
    }
  }

  /**
   * Get sync operation logs
   */
  static async getSyncLogs(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ekyc_sync_log')
        .select('*')
        .order('sync_timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error getting sync logs:', error);
        throw new Error(`Failed to get sync logs: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getSyncLogs:', error);
      throw error;
    }
  }

  /**
   * Monitor eKYC sync health
   */
  static async monitorSyncHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    stats: any;
    mismatches: any[];
  }> {
    try {
      const [stats, mismatches] = await Promise.all([
        this.getSyncStatistics(),
        this.checkSyncMismatches()
      ]);

      const issues: string[] = [];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check for critical issues
      if (mismatches.length > 0) {
        issues.push(`${mismatches.length} sync mismatch(es) detected`);
        status = 'critical';
      }

      // Check for warnings
      if (stats.recent_syncs_24h === 0 && stats.pending_submissions > 0) {
        issues.push('No recent sync operations despite pending submissions');
        if (status !== 'critical') status = 'warning';
      }

      if (stats.sync_mismatches > 0) {
        issues.push(`${stats.sync_mismatches} total sync mismatches`);
        if (status !== 'critical') status = 'warning';
      }

      return {
        status,
        issues,
        stats,
        mismatches
      };
    } catch (error) {
      console.error('❌ Error monitoring sync health:', error);
      return {
        status: 'critical',
        issues: [`Monitoring failed: ${error.message}`],
        stats: {},
        mismatches: []
      };
    }
  }
}