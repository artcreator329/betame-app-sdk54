# BetaMe Admin Dashboard

This is a standalone deployment of the BetaMe Admin Dashboard for web access.

## Features

- User management and analytics
- Service moderation tools
- Transaction monitoring
- Chat management
- System settings and preferences
- Real-time notifications

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:web
```

## Deployment

This project is configured for deployment on Netlify. The build process will:

1. Build the web version using Expo
2. Copy static assets to the dist folder
3. Deploy to Netlify with proper redirects

## Environment Variables

Make sure to set the following environment variables in your Netlify deployment:

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Access Control

This dashboard is restricted to admin users only. Users must be authenticated and have admin privileges to access the dashboard.
