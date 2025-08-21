#!/bin/bash

echo "🚀 Deploying BetaMe Admin Dashboard to Netlify..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build:web

# Copy static assets
echo "📁 Copying static assets..."
cp -r public/* dist/ 2>/dev/null || true

echo "✅ Build completed! Ready for deployment to Netlify."
echo ""
echo "📋 Next steps:"
echo "1. Connect this directory to Netlify"
echo "2. Set build command: npm run build:web && cp -r public/* dist/ 2>/dev/null || true"
echo "3. Set publish directory: dist"
echo "4. Add environment variables:"
echo "   - EXPO_PUBLIC_SUPABASE_URL"
echo "   - EXPO_PUBLIC_SUPABASE_ANON_KEY"
echo ""
echo "🌐 Your admin dashboard will be available at your Netlify URL"
