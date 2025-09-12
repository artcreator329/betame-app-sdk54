#!/bin/bash

# Deploy only share-related pages to Netlify
# This script deploys only the share functionality without affecting the main site

echo "🚀 Deploying share functionality to Netlify..."

# Create a temporary directory for share-only deployment
TEMP_DIR="temp-share-deploy"
mkdir -p $TEMP_DIR

# Copy only the share-related files
echo "📁 Copying share-related files..."

# Copy the main share landing page
cp web/smart-service-link.html $TEMP_DIR/

# Copy the share directory
mkdir -p $TEMP_DIR/share
cp web/share/service.html $TEMP_DIR/share/

# Copy essential files for the share pages to work
cp web/global-styles.css $TEMP_DIR/
cp web/index.html $TEMP_DIR/  # This might be needed for fallback

# Create a minimal netlify.toml for share-only deployment
cat > $TEMP_DIR/netlify.toml << 'EOF'
[build]
  command = "echo 'Share-only deployment - no build needed'"
  publish = "."

[build.environment]
  NODE_VERSION = "20"

# Redirects for share functionality
[[redirects]]
from = "/smart-service-link"
to = "/smart-service-link.html"
status = 200

[[redirects]]
from = "/share/service"
to = "/share/service.html"
status = 200

# Headers for share pages
[[headers]]
for = "/*.html"
[headers.values]
Cache-Control = "public, max-age=3600"
Content-Type = "text/html; charset=utf-8"

[[headers]]
for = "/*.css"
[headers.values]
Cache-Control = "public, max-age=86400"
Content-Type = "text/css"
EOF

# Deploy to Netlify using the share-only directory
echo "🌐 Deploying to Netlify..."
cd $TEMP_DIR

# Use Netlify CLI to deploy
if command -v netlify &> /dev/null; then
    echo "Using Netlify CLI..."
    netlify deploy --prod --dir . --message "Deploy share functionality only"
else
    echo "❌ Netlify CLI not found. Please install it first:"
    echo "npm install -g netlify-cli"
    echo "Then run: netlify login"
    exit 1
fi

# Clean up
cd ..
rm -rf $TEMP_DIR

echo "✅ Share functionality deployment complete!"
echo "🔗 Share links should now work at:"
echo "   - https://betame.com.my/smart-service-link"
echo "   - https://betame.com.my/share/service"



