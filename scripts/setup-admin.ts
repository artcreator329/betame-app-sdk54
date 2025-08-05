import { adminService } from '../lib/admin-service';

/**
 * Script to set up the admin user for the BetaMe app
 * This creates the developer@betame.com.my user with admin privileges
 */
async function setupAdmin() {
  try {
    console.log('Setting up admin user...');
    
    const adminEmail = 'developer@betame.com.my';
    const adminPassword = 'AdminBetaMe2024!';
    
    // Create admin user
    const result = await adminService.createAdminUser(
      adminEmail,
      adminPassword,
      'BetaMe Admin'
    );
    
    if (result.success) {
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password:', adminPassword);
      console.log('🛡️ Role: super_admin');
      console.log('\n⚠️  Please save these credentials securely and change the password after first login.');
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