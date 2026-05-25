import { adminService } from '../lib/admin-service';

/**
 * Script to set up the admin user for the BetaMe app
 * Requires ADMIN_EMAIL and ADMIN_PASSWORD environment variables.
 */
async function setupAdmin() {
  try {
    console.log('Setting up admin user...');
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminFullName = process.env.ADMIN_FULL_NAME || 'BetaMe Admin';

    if (!adminEmail || !adminPassword) {
      throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variable.');
    }
    
    // Create admin user
    const result = await adminService.createAdminUser(
      adminEmail,
      adminPassword,
      adminFullName
    );
    
    if (result.success) {
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email:', adminEmail);
      console.log('🛡️ Role: super_admin');
      console.log('\n⚠️  Store the password securely and rotate it after first login.');
    } else {
      console.error('❌ Failed to create admin user:', result.error);
    }
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupAdmin();
}

export { setupAdmin };