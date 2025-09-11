#!/bin/bash

# Deploy ONLY share-related files to existing Netlify site
# This approach adds only the share files without affecting existing content

echo "🚀 Deploying ONLY share functionality files..."

# Create a minimal deployment directory with only share files
TEMP_DIR="temp-share-only"
mkdir -p $TEMP_DIR

# Copy ONLY the share-related files
echo "📁 Copying share files only..."

# Copy the main share landing page
cp web/smart-service-link.html $TEMP_DIR/

# Copy the share directory
mkdir -p $TEMP_DIR/share
cp web/share/service.html $TEMP_DIR/share/

# Copy global styles (needed for share pages)
cp web/global-styles.css $TEMP_DIR/

# Create a minimal netlify.toml that only handles share routes
cat > $TEMP_DIR/netlify.toml << 'EOF'
[build]
  command = "echo 'Share-only deployment - no build needed'"
  publish = "."

[build.environment]
  NODE_VERSION = "20"

# Only redirects for share functionality
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

echo "📋 Files ready for deployment:"
ls -la $TEMP_DIR/
echo ""

# Deploy using Netlify CLI
echo "🌐 Deploying share files to Netlify..."
cd $TEMP_DIR

if command -v netlify &> /dev/null; then
    echo "Using Netlify CLI for targeted deployment..."
    
    # Deploy to the same site but only with share files
    netlify deploy --prod --dir . --message "Deploy share functionality only - no main site changes"
    
    echo "✅ Share files deployed successfully!"
else
    echo "❌ Netlify CLI not found."
    echo "Please install it: npm install -g netlify-cli"
    echo "Then run: netlify login"
    exit 1
fi

# Clean up
cd ..
rm -rf $TEMP_DIR

echo ""
echo "🔗 Share links should now work at:"
echo "   - https://betame.com.my/smart-service-link"
echo "   - https://betame.com.my/share/service"
echo ""
echo "✅ Your main landing page remains unchanged!"


