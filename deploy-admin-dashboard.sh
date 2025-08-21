#!/bin/bash

echo "🚀 Deploying BetaMe Admin Dashboard to Netlify..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Create a temporary directory for admin deployment
echo "📁 Creating admin deployment directory..."
mkdir -p admin-deploy-temp

# Copy necessary files
echo "📋 Copying project files..."
cp -r app admin-deploy-temp/
cp -r components admin-deploy-temp/
cp -r contexts admin-deploy-temp/
cp -r lib admin-deploy-temp/
cp -r constants admin-deploy-temp/
cp -r types admin-deploy-temp/
cp -r assets admin-deploy-temp/
cp -r public admin-deploy-temp/
cp -r metro-shims admin-deploy-temp/
cp -r hooks admin-deploy-temp/
cp package.json admin-deploy-temp/
cp app.json admin-deploy-temp/
cp tsconfig.json admin-deploy-temp/
cp metro.config.js admin-deploy-temp/
cp babel.config.js admin-deploy-temp/
cp netlify-admin.toml admin-deploy-temp/netlify.toml

# Create a README for the admin deployment
cat > admin-deploy-temp/README.md << 'EOF'
# BetaMe Admin Dashboard

This is a standalone deployment of the BetaMe Admin Dashboard for web access.

## Features

- User management and analytics
- Service moderation tools
- Transaction monitoring
- Chat management
- System settings and preferences
- Real-time notifications

## Environment Variables

Make sure to set the following environment variables in your Netlify deployment:

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `EXPO_PUBLIC_ADMIN_ONLY` - Set to "true" for admin-only deployment

## Access Control

This dashboard is restricted to admin users only. Users must be authenticated and have admin privileges to access the dashboard.
EOF

echo "✅ Admin deployment directory created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Navigate to the admin-deploy-temp directory"
echo "2. Connect this directory to Netlify"
echo "3. Set the following environment variables in Netlify:"
echo "   - EXPO_PUBLIC_SUPABASE_URL"
echo "   - EXPO_PUBLIC_SUPABASE_ANON_KEY"
echo "   - EXPO_PUBLIC_ADMIN_ONLY = true"
echo "4. Deploy to Netlify"
echo ""
echo "🌐 Your admin dashboard will be available at your Netlify URL"
echo ""
echo "💡 To deploy:"
echo "   cd admin-deploy-temp"
echo "   # Then connect to Netlify and deploy"
