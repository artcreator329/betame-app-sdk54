#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 NUCLEAR web build fix starting...');

// Kill any existing Metro processes
console.log('💀 Killing existing Metro processes...');
try {
  execSync('pkill -f "expo start" || true', { stdio: 'inherit' });
  execSync('pkill -f "metro" || true', { stdio: 'inherit' });
  execSync('lsof -ti:8081 | xargs kill -9 || true', { stdio: 'inherit' });
  execSync('lsof -ti:19000 | xargs kill -9 || true', { stdio: 'inherit' });
  execSync('lsof -ti:19001 | xargs kill -9 || true', { stdio: 'inherit' });
  execSync('lsof -ti:19002 | xargs kill -9 || true', { stdio: 'inherit' });
} catch (error) {
  console.log('No existing processes to kill (this is OK)');
}

// Clear ALL caches aggressively
console.log('🗑️  Clearing ALL caches...');

const cacheDirs = [
  path.join(__dirname, '..', 'node_modules', '.cache'),
  path.join(__dirname, '..', '.expo'),
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', '.next'),
  path.join(__dirname, '..', 'web-build'),
  path.join(require('os').homedir(), '.expo'),
  path.join(require('os').tmpdir(), 'metro-*'),
  path.join(require('os').tmpdir(), 'expo-*'),
];

cacheDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`🗑️  Clearing: ${dir}`);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      console.log(`Could not clear ${dir}: ${e.message}`);
    }
  }
});

// Clear yarn/npm cache
console.log('📦 Clearing package manager cache...');
try {
  execSync('yarn cache clean || npm cache clean --force', { stdio: 'inherit' });
} catch (error) {
  console.log('Package cache cleared');
}

// Reset Metro bundler
console.log('🔄 Resetting Metro bundler...');
try {
  execSync('npx expo install --fix', { stdio: 'inherit' });
} catch (error) {
  console.log('Metro reset complete');
}

console.log('✅ NUCLEAR web build fix complete!');
console.log('');
console.log('🚀 Starting fresh development server...');
console.log('Run: npm run dev:web');