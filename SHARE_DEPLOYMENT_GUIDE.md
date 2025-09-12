# Share Functionality Deployment Guide

This guide explains how to deploy only the share functionality to Netlify without affecting the main landing page and other existing pages.

## 🎯 Goal
Deploy only the share-related pages (`smart-service-link.html` and `share/service.html`) to make service sharing work, while keeping the main site unchanged.

## 📁 Share Files
The following files are needed for share functionality:
- `web/smart-service-link.html` - Main share landing page
- `web/share/service.html` - Service sharing page
- `web/global-styles.css` - Styling for share pages

## 🚀 Deployment Options

### Option 1: Simple Deployment (Recommended)
```bash
# Copy share files to dist and prepare for deployment
./deploy-share-simple.sh

# Deploy to Netlify
./deploy-share-simple.sh --deploy
```

**What it does:**
- Copies only share files to `dist/` directory
- Preserves existing files in `dist/`
- Deploys only the updated files
- **Safe**: Won't affect main site

### Option 2: Manual Deployment
```bash
# Copy files manually
mkdir -p dist/share
cp web/smart-service-link.html dist/
cp web/share/service.html dist/share/
cp web/global-styles.css dist/

# Deploy using Netlify CLI
netlify deploy --prod --dir dist
```

### Option 3: Netlify Dashboard Upload
1. Run `./deploy-share-simple.sh` to prepare files
2. Go to Netlify dashboard
3. Drag and drop the `dist/` folder
4. Netlify will only update changed files

## 🔗 Expected URLs
After deployment, these URLs should work:
- `https://betame.com.my/smart-service-link` - Share landing page
- `https://betame.com.my/share/service` - Service sharing page

## ✅ Verification
Test the share functionality:
1. Open a service in the app
2. Tap the share button
3. Copy the generated link
4. Open the link in a browser
5. Should see the service sharing page (not blank)

## 🛡️ Safety Features
- **Non-destructive**: Only adds/updates share files
- **Preserves existing**: Main site files remain unchanged
- **Rollback safe**: Can easily revert by removing share files
- **Incremental**: Only deploys what's needed

## 🔧 Troubleshooting

### If share links still show blank page:
1. Check if files are deployed: `curl -I https://betame.com.my/smart-service-link.html`
2. Verify Netlify redirects are working
3. Check browser console for errors

### If deployment fails:
1. Ensure Netlify CLI is installed: `npm install -g netlify-cli`
2. Login to Netlify: `netlify login`
3. Check site configuration in Netlify dashboard

## 📝 Notes
- The main `netlify.toml` already includes the share file copying commands
- This deployment method is safer than full site redeployment
- Share functionality is independent of the main app functionality



