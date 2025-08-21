# BetaMe

A dedicated admin dashboard for the BetaMe platform, providing comprehensive management tools for administrators.

## Features

- **User Management**: View, manage, and analyze user accounts
- **Service Moderation**: Review and moderate service listings
- **Analytics Dashboard**: Real-time statistics and insights
- **Transaction Monitoring**: Track payments and revenue
- **Chat Management**: Monitor and manage user communications
- **System Settings**: Configure platform settings and preferences
- **Notification System**: Send and manage system notifications

## Tech Stack

- **Framework**: Expo Router with React Native
- **Language**: TypeScript
- **Database**: Supabase
- **Authentication**: Supabase Auth
- **Deployment**: Netlify
- **Styling**: React Native StyleSheet

## Development

### Prerequisites

- Node.js >= 20.0.0
- Yarn package manager
- Expo CLI

### Setup

1. **Install dependencies**:
   ```bash
   yarn install
   ```

2. **Environment variables**:
   Create a `.env` file with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_ADMIN_ONLY=true
   ```

3. **Start development server**:
   ```bash
   yarn dev
   ```

### Build

- **Web build**:
  ```bash
  yarn build:web
  ```

- **Android build**:
  ```bash
  yarn build:android
  ```

## Deployment

This project is configured for deployment on Netlify with:
- Node.js 20
- Admin-only environment
- Optimized build settings

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `EXPO_PUBLIC_ADMIN_ONLY` | Set to "true" for admin-only deployment | Yes |

## Project Structure

```
betame-app-admin/
├── app/                    # Expo Router pages
│   ├── admin/             # Admin-specific pages
│   ├── admin-dashboard.tsx # Main dashboard
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   └── Admin*.tsx         # Admin-specific components
├── contexts/              # React contexts
├── lib/                   # Utility libraries
├── constants/             # App constants
├── types/                 # TypeScript types
├── assets/                # Static assets
└── public/                # Public files
```

## Access Control

This dashboard is restricted to admin users only. Users must:
1. Be authenticated with a valid account
2. Have admin privileges in the database
3. Access through the dedicated admin URL

## Security

- Protected by Supabase Row Level Security (RLS)
- Admin-only access controls
- Secure environment variable handling
- HTTPS-only deployment

## Support

For issues or questions:
1. Check the build logs
2. Review Supabase dashboard
3. Contact the development team

---

**Note**: This is a standalone admin dashboard separate from the main BetaMe application.
