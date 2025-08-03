# Google Maps Integration Setup

This guide explains how to set up Google Maps for the location picker in the job listing creation screen.

## Prerequisites

1. **Google Cloud Console Account**: You need a Google Cloud Console account to create API keys.
2. **Google Places API Key**: Required for location search functionality.

## Setup Instructions

### 1. Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Places API** (required for location search)
   - **Maps JavaScript API** (required for map display)
   - **Geocoding API** (optional, for reverse geocoding)

4. Go to "Credentials" and create a new API key
5. Restrict the API key to your app's bundle identifier for security

### 2. Configure API Key

1. Open `config/maps.ts`
2. Replace `'YOUR_GOOGLE_PLACES_API_KEY'` with your actual API key:

```typescript
export const GOOGLE_PLACES_API_KEY = 'your-actual-api-key-here';
```

### 3. Features Implemented

✅ **Location Search**: Users can search for specific locations using Google Places Autocomplete
✅ **Map View**: Interactive map showing the selected location
✅ **Marker**: Custom marker indicating the selected location
✅ **Address Display**: Shows the full address of the selected location
✅ **Malaysia Focus**: Search is restricted to Malaysia locations
✅ **Modal Interface**: Clean modal popup for location selection

### 4. How It Works

1. User taps on "Work Location" field
2. Modal opens with:
   - Google Places search bar at the top
   - Interactive map below
3. User can:
   - Type to search for locations
   - Tap on search results to select
   - Tap directly on the map to select a location
4. Selected location is displayed with address
5. User taps "Done" to confirm selection

### 5. Security Notes

- **API Key Restrictions**: Always restrict your API key to your app's bundle identifier
- **Usage Limits**: Monitor your API usage in Google Cloud Console
- **Billing**: Google Places API has usage-based pricing

### 6. Troubleshooting

**Map not loading?**
- Check if your API key is valid
- Ensure Maps JavaScript API is enabled
- Verify API key restrictions

**Search not working?**
- Check if Places API is enabled
- Verify your API key has Places API access
- Check network connectivity

**Location not accurate?**
- The search is restricted to Malaysia (`components: 'country:my'`)
- You can modify this in the GooglePlacesAutocomplete component

**"crypto.getRandomValues() not supported" error?**
- This has been fixed with crypto polyfills in `metro-shims/crypto-polyfill.js`
- The polyfill is automatically imported in `app/_layout.tsx`
- Required dependencies: `crypto-browserify`, `readable-stream`, `buffer`

## Cost Considerations

Google Places API charges per request:
- **Autocomplete requests**: ~$2.83 per 1000 requests
- **Place Details requests**: ~$17 per 1000 requests

For development, Google provides $200 free credits monthly.