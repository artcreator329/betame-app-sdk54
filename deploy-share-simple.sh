#!/bin/bash

# Simple deployment of share files only
# This script copies share files to dist and deploys them without affecting other files

echo "🚀 Deploying share functionality files only..."

# Ensure dist directory exists
mkdir -p dist

# Copy only the share-related files to dist
echo "📁 Copying share files to dist directory..."

# Copy the main share landing page
cp web/smart-service-link.html dist/

# Create share directory in dist and copy the service page
mkdir -p dist/share
cp web/share/service.html dist/share/

# Copy global styles if not already present
if [ ! -f "dist/global-styles.css" ]; then
    cp web/global-styles.css dist/
fi

echo "✅ Share files copied to dist directory"
echo "📋 Files ready for deployment:"
echo "   - dist/smart-service-link.html"
echo "   - dist/share/service.html"
echo "   - dist/global-styles.css"

# Check if we should deploy automatically
if [ "$1" = "--deploy" ]; then
    echo "🌐 Deploying to Netlify..."
    
    if command -v netlify &> /dev/null; then
        # Deploy only the dist directory
        netlify deploy --prod --dir dist --message "Deploy share functionality only"
        echo "✅ Deployment complete!"
    else
        echo "❌ Netlify CLI not found. Please install it:"
        echo "npm install -g netlify-cli"
        echo "Then run: netlify login"
        echo ""
        echo "Manual deployment:"
        echo "1. Go to Netlify dashboard"
        echo "2. Drag and drop the dist folder"
        echo "3. Or use: netlify deploy --prod --dir dist"
    fi
else
    echo "💡 To deploy, run: ./deploy-share-simple.sh --deploy"
    echo "🔗 Or manually upload the dist folder to Netlify"
fi

echo ""
echo "🔗 Share links will work at:"
echo "   - https://betame.com.my/smart-service-link"
echo "   - https://betame.com.my/share/service"



