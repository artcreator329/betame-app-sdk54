#!/usr/bin/env node

/**
 * Pre-build hook that automatically updates version numbers
 * This can be integrated with EAS Build hooks or run manually before builds
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function main() {
  console.log('🚀 Running pre-build hook...');
  
  try {
    // Determine platform from environment or arguments
    const platform = process.env.EAS_BUILD_PLATFORM || process.argv[2] || 'both';
    
    console.log(`📱 Platform: ${platform}`);
    
    // Update version numbers
    console.log('🔄 Updating version numbers...');
    execSync(`node ${path.join(__dirname, 'update-version.js')} ${platform}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Pre-build hook completed successfully!');
    
  } catch (error) {
    console.error('❌ Pre-build hook failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };