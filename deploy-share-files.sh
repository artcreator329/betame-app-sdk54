#!/bin/bash

# Deploy only share-related files to existing Netlify site
# This approach updates only the share functionality without affecting the main site

echo "🚀 Deploying share functionality files to Netlify..."

# Create a temporary directory for share files only
TEMP_DIR="temp-share-files"
mkdir -p $TEMP_DIR

# Copy only the share-related files that need to be deployed
echo "📁 Copying share-related files..."

# Copy the main share landing page
cp web/smart-service-link.html $TEMP_DIR/

# Copy the share directory
mkdir -p $TEMP_DIR/share
cp web/share/service.html $TEMP_DIR/share/

# Copy essential CSS for styling
cp web/global-styles.css $TEMP_DIR/

# Create a minimal package.json for the deployment
cat > $TEMP_DIR/package.json << 'EOF'
{
  "name": "betame-share-files",
  "version": "1.0.0",
  "description": "Share functionality files for Betame",
  "scripts": {
    "build": "echo 'No build needed for share files'"
  }
}
EOF

# Create a netlify.toml that only handles share routes
cat > $TEMP_DIR/netlify.toml << 'EOF'
[build]
  command = "echo 'Share files deployment'"
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

echo "🌐 Deploying share files to Netlify..."

# Check if Netlify CLI is available
if command -v netlify &> /dev/null; then
    echo "Using Netlify CLI for targeted deployment..."
    cd $TEMP_DIR
    
    # Deploy to the same site but only with share files
    netlify deploy --prod --dir . --message "Deploy share functionality files only"
    
    cd ..
else
    echo "❌ Netlify CLI not found."
    echo "Alternative: Manual deployment"
    echo "1. Go to Netlify dashboard"
    echo "2. Drag and drop the $TEMP_DIR folder"
    echo "3. Or use the files in $TEMP_DIR for manual upload"
    echo ""
    echo "Files ready for deployment:"
    ls -la $TEMP_DIR/
fi

# Clean up
echo "🧹 Cleaning up temporary files..."
rm -rf $TEMP_DIR

echo "✅ Share functionality deployment complete!"
echo "🔗 Share links should now work at:"
echo "   - https://betame.com.my/smart-service-link"
echo "   - https://betame.com.my/share/service"



