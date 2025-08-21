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
