#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDashboardStats() {
  console.log('🔍 Testing Dashboard Stats...\n');

  try {
    // Test the services query specifically
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, is_active, created_at', { count: 'exact' });

    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError);
      return;
    }

    console.log(`📊 Total services: ${services?.length || 0}`);
    
    if (services && services.length > 0) {
      const activeServices = services.filter(s => s.is_active === true);
      const inactiveServices = services.filter(s => s.is_active === false);
      const unknownServices = services.filter(s => s.is_active === null || s.is_active === undefined);
      
      console.log(`✅ Active services: ${activeServices.length}`);
      console.log(`❌ Inactive services: ${inactiveServices.length}`);
      console.log(`❓ Unknown status services: ${unknownServices.length}`);
      
      console.log('\n🔍 Service status breakdown:');
      services.forEach((service, index) => {
        console.log(`${index + 1}. ID: ${service.id.substring(0, 8)}... - Active: ${service.is_active}`);
      });
      
      // If all services have null/undefined is_active, let's set some to active for testing
      if (unknownServices.length === services.length) {
        console.log('\n⚠️  All services have null/undefined is_active status');
        console.log('🔧 Setting first 3 services to active for testing...');
        
        for (let i = 0; i < Math.min(3, services.length); i++) {
          const { error: updateError } = await supabase
            .from('services')
            .update({ is_active: true })
            .eq('id', services[i].id);
            
          if (updateError) {
            console.error(`❌ Error updating service ${i + 1}:`, updateError);
          } else {
            console.log(`✅ Updated service ${i + 1} to active`);
          }
        }
        
        // Set remaining services to inactive
        for (let i = 3; i < services.length; i++) {
          const { error: updateError } = await supabase
            .from('services')
            .update({ is_active: false })
            .eq('id', services[i].id);
            
          if (updateError) {
            console.error(`❌ Error updating service ${i + 1}:`, updateError);
          } else {
            console.log(`✅ Updated service ${i + 1} to inactive`);
          }
        }
        
        console.log('\n🔄 Re-testing after updates...');
        
        // Re-fetch to see the changes
        const { data: updatedServices } = await supabase
          .from('services')
          .select('id, is_active, created_at', { count: 'exact' });
          
        if (updatedServices) {
          const newActiveServices = updatedServices.filter(s => s.is_active === true);
          const newInactiveServices = updatedServices.filter(s => s.is_active === false);
          
          console.log(`✅ Active services after update: ${newActiveServices.length}`);
          console.log(`❌ Inactive services after update: ${newInactiveServices.length}`);
        }
      }
    } else {
      console.log('⚠️  No services found');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDashboardStats();