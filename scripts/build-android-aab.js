#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

  console.log('🚀 Starting Android AAB build for BetaMe...');
  console.log('📱 Developer Account: betame.developer@gmail.com');
  console.log('📦 Package: com.betame.app');
  console.log('🔐 Release signing enabled');
  console.log('');

// Check if we're in the right directory
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Check if Android directory exists
const androidDir = path.join(__dirname, '..', 'android');
if (!fs.existsSync(androidDir)) {
  console.error('❌ Error: Android directory not found. Please run "npx expo prebuild" first.');
  process.exit(1);
}

// Function to create keystore if it doesn't exist
function createKeystoreIfMissing() {
  const keystorePath = path.join(androidDir, 'app', 'betame-release-key.keystore');
  if (!fs.existsSync(keystorePath)) {
    console.log('🔑 Creating release keystore...');
    try {
      execSync(`cd ${path.join(androidDir, 'app')} && keytool -genkey -v -keystore betame-release-key.keystore -alias betame-key-alias -keyalg RSA -keysize 2048 -validity 10000 -storepass betame123 -keypass betame123 -dname "CN=BetaMe, OU=BetaMe Team, O=BetaMe, L=Kuala Lumpur, S=Selangor, C=MY"`, { stdio: 'inherit' });
      console.log('✅ Release keystore created');
    } catch (error) {
      console.error('❌ Failed to create keystore:', error.message);
      process.exit(1);
    }
  }
}

// Function to fix signing configuration after prebuild
function fixSigningConfiguration() {
  console.log('🔧 Fixing signing configuration after prebuild...');
  
  const buildGradlePath = path.join(androidDir, 'app', 'build.gradle');
  const keystorePropertiesPath = path.join(androidDir, 'app', 'keystore.properties');
  
  // Create keystore properties file
  const keystoreProperties = `storeFile=betame-release-key.keystore
storePassword=betame123
keyAlias=betame-key-alias
keyPassword=betame123
`;
  
  fs.writeFileSync(keystorePropertiesPath, keystoreProperties);
  console.log('✅ Keystore properties file created');
  
  // Read the build.gradle file
  let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');
  
  // Add keystore properties loading after the plugins
  const keystorePropertiesLoading = `
// Load keystore properties
def keystorePropertiesFile = rootProject.file("app/keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
`;
  
  // Insert keystore properties loading after the plugins
  const pluginEndIndex = buildGradleContent.indexOf('def projectRoot');
  if (pluginEndIndex !== -1) {
    buildGradleContent = buildGradleContent.slice(0, pluginEndIndex) + keystorePropertiesLoading + buildGradleContent.slice(pluginEndIndex);
  }
  
  // Add release signing configuration
  const releaseSigningConfig = `
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }`;
  
  // Find the signingConfigs section and add release config
  const signingConfigsIndex = buildGradleContent.indexOf('signingConfigs {');
  if (signingConfigsIndex !== -1) {
    const debugConfigEndIndex = buildGradleContent.indexOf('}', signingConfigsIndex);
    if (debugConfigEndIndex !== -1) {
      buildGradleContent = buildGradleContent.slice(0, debugConfigEndIndex) + releaseSigningConfig + buildGradleContent.slice(debugConfigEndIndex);
    }
  }
  
  // Fix the release build type to use release signing
  buildGradleContent = buildGradleContent.replace(
    /signingConfig signingConfigs\.debug/g,
    'signingConfig signingConfigs.release'
  );
  
  // Write the updated build.gradle file
  fs.writeFileSync(buildGradlePath, buildGradleContent);
  console.log('✅ Signing configuration fixed in build.gradle');
}

try {
  console.log('📋 Step 1: Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');

  // Create keystore if missing
  createKeystoreIfMissing();

  console.log('🔧 Step 2: Prebuilding Android project...');
  execSync('npx expo prebuild --platform android --clean', { stdio: 'inherit' });
  console.log('✅ Android project prebuilt\n');

  // Fix signing configuration after prebuild
  fixSigningConfiguration();

  console.log('🏗️  Step 3: Building Android AAB...');
  
  // Change to android directory
  process.chdir(androidDir);
  
  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  execSync('./gradlew clean', { stdio: 'inherit' });
  
  // Build AAB
  console.log('📦 Building AAB...');
  execSync('./gradlew bundleRelease', { stdio: 'inherit' });
  
  console.log('✅ Android AAB build completed successfully!');
  
  // Check if AAB file was created
  const aabPath = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  if (fs.existsSync(aabPath)) {
    const stats = fs.statSync(aabPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📱 AAB file created: ${aabPath}`);
    console.log(`📊 File size: ${fileSizeInMB} MB`);
    console.log('');
    console.log('🎉 Build Summary:');
    console.log('   • Package: com.betame.app');
    console.log('   • Version: 1.0.0');
    console.log('   • Developer: betame.developer@gmail.com');
    console.log('   • File: app-release.aab');
    console.log('');
    console.log('📤 Next steps:');
    console.log('   1. Upload the AAB file to Google Play Console');
    console.log('   2. Use developer account: betame.developer@gmail.com');
    console.log('   3. Complete the app store listing');
  } else {
    console.error('❌ Error: AAB file not found after build');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
