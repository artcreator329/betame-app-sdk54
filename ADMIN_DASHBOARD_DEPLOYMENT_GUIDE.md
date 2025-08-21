# BetaMe Admin Dashboard Deployment Guide

This guide will help you deploy the BetaMe Admin Dashboard as a separate Netlify site.

## Overview

The admin dashboard is deployed as a standalone web application that provides admin-only access to the BetaMe management console. It includes:

- User management and analytics
- Service moderation tools
- Transaction monitoring
- Chat management
- System settings and preferences
- Real-time notifications

## Prerequisites

- A Netlify account
- Access to your Supabase project credentials
- Git repository access

## Deployment Steps

### 1. Prepare the Deployment

The deployment files are already prepared in the `admin-deploy-temp` directory. This directory contains:

- All necessary source code
- Configuration files
- Build scripts
- Netlify configuration

### 2. Deploy to Netlify

#### Option A: Deploy via Netlify UI

1. **Create a new site on Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Choose your Git provider (GitHub, GitLab, etc.)

2. **Connect the repository:**
   - Select your repository
   - Set the base directory to `admin-deploy-temp`
   - Set the build command: `npm run build:web && cp -r public/* dist/ 2>/dev/null || true`
   - Set the publish directory: `dist`

3. **Configure environment variables:**
   - Go to Site settings > Environment variables
   - Add the following variables:
     ```
     EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     EXPO_PUBLIC_ADMIN_ONLY=true
     ```

4. **Deploy:**
   - Click "Deploy site"
   - Wait for the build to complete

#### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Navigate to the admin deployment directory:**
   ```bash
   cd admin-deploy-temp
   ```

3. **Login to Netlify:**
   ```bash
   netlify login
   ```

4. **Initialize and deploy:**
   ```bash
   netlify init
   netlify deploy --prod
   ```

5. **Set environment variables:**
   ```bash
   netlify env:set EXPO_PUBLIC_SUPABASE_URL your_supabase_url
   netlify env:set EXPO_PUBLIC_SUPABASE_ANON_KEY your_supabase_anon_key
   netlify env:set EXPO_PUBLIC_ADMIN_ONLY true
   ```

### 3. Configure Custom Domain (Optional)

1. Go to your Netlify site dashboard
2. Navigate to Domain settings
3. Add your custom domain (e.g., `admin.betame.com`)
4. Configure DNS settings as instructed by Netlify

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `EXPO_PUBLIC_ADMIN_ONLY` | Set to "true" for admin-only deployment | Yes |

## Access Control

The admin dashboard is restricted to admin users only. Users must:

1. Be authenticated with a valid account
2. Have admin privileges in the database
3. Access the dashboard through the deployed URL

## Security Considerations

- The dashboard is protected by Supabase Row Level Security (RLS)
- Only users with admin role can access admin functions
- All API calls are authenticated through Supabase
- Environment variables are encrypted in Netlify

## Troubleshooting

### Build Failures

1. **Check environment variables:** Ensure all required environment variables are set
2. **Check dependencies:** Verify all dependencies are properly installed
3. **Check build logs:** Review Netlify build logs for specific error messages

### Authentication Issues

1. **Verify Supabase credentials:** Ensure the Supabase URL and key are correct
2. **Check admin permissions:** Verify the user has admin role in the database
3. **Check RLS policies:** Ensure Row Level Security policies allow admin access

### Performance Issues

1. **Enable caching:** Configure Netlify caching for static assets
2. **Optimize images:** Use optimized image formats and sizes
3. **Monitor usage:** Check Netlify analytics for performance insights

## Maintenance

### Updates

To update the admin dashboard:

1. Make changes to the main codebase
2. Run the deployment script: `./deploy-admin-dashboard.sh`
3. Commit and push changes to the `admin-deploy-temp` directory
4. Netlify will automatically rebuild and deploy

### Monitoring

- Monitor Netlify build status and performance
- Check Supabase logs for API usage
- Monitor user access and authentication
- Review error logs for issues

## Support

For issues with the admin dashboard deployment:

1. Check the Netlify build logs
2. Review the Supabase dashboard for errors
3. Check the browser console for client-side errors
4. Contact the development team for assistance

## URLs

- **Production:** Your Netlify URL (e.g., `https://betame-admin.netlify.app`)
- **Development:** Local development server (e.g., `http://localhost:8081`)

---

**Note:** This admin dashboard is a separate deployment from the main BetaMe application. It provides secure, admin-only access to the management console while keeping the main application separate.
