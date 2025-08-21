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

async function checkServicesColumns() {
  console.log('🔍 Checking Services Table Columns...\n');

  try {
    // Get one service to see all available columns
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error fetching services:', error);
      return;
    }

    if (services && services.length > 0) {
      console.log('📋 Available columns in services table:');
      const columns = Object.keys(services[0]);
      columns.forEach((column, index) => {
        const value = services[0][column];
        const type = typeof value;
        console.log(`${index + 1}. ${column}: ${type} = ${value}`);
      });
      
      console.log('\n🔍 Looking for status-related columns:');
      const statusColumns = columns.filter(col => 
        col.toLowerCase().includes('status') || 
        col.toLowerCase().includes('active') ||
        col.toLowerCase().includes('enabled') ||
        col.toLowerCase().includes('visible')
      );
      
      if (statusColumns.length > 0) {
        console.log('Found status-related columns:', statusColumns);
      } else {
        console.log('No obvious status-related columns found');
        console.log('Available columns:', columns.join(', '));
      }
    } else {
      console.log('⚠️  No services found to check columns');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkServicesColumns();