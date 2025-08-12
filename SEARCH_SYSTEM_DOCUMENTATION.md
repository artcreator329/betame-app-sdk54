# Search System with Auto-Complete Documentation

## Overview

The search system provides intelligent auto-complete suggestions based on your database content, including services, jobs, users, categories, and locations. It features real-time suggestions, recent search history, and popular search terms.

## Components

### 1. Search Service (`lib/search-service.ts`)

Core service that handles all search functionality:

**Key Methods:**
- `getAutoCompleteSuggestions(query)` - Returns real-time suggestions as user types
- `search(query, filters?)` - Performs full search with optional filters
- `getPopularSearchTerms()` - Gets trending/popular search terms
- `saveRecentSearch(term)` - Saves search to recent history

**Search Types:**
- **Services** - Searches service titles, descriptions, and categories
- **Jobs** - Searches job titles and descriptions
- **Users** - Searches user names and bios
- **Categories** - Distinct service categories
- **Locations** - Service and job locations

### 2. Auto-Complete Search Bar (`components/SearchBarWithAutoComplete.tsx`)

Advanced search input with intelligent suggestions:

**Features:**
- Real-time auto-complete (300ms debounce)
- Recent search history
- Popular search terms
- Image thumbnails for results
- Rating display for services
- Smart navigation based on result type

**Props:**
```typescript
interface SearchBarWithAutoCompleteProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  initialValue?: string;
  showPopularTerms?: boolean;
  style?: any;
}
```

### 3. Search Results Page (`app/search.tsx`)

Dedicated search results page with:
- Tabbed results (All, Services, Jobs, People)
- Result counts
- Filtering capabilities
- Loading states
- Empty states

### 4. Recent Searches Hook (`hooks/useRecentSearches.ts`)

Manages search history with AsyncStorage:
- Stores up to 10 recent searches
- Automatic deduplication
- Persistent across app sessions

## Database Integration

### Search Queries

The system searches across multiple tables:

```sql
-- Services Search
SELECT id, title, description, price, currency, image_url, category_name, location, rating, user_id
FROM services 
WHERE (title ILIKE '%query%' OR description ILIKE '%query%' OR category_name ILIKE '%query%')
AND status = 'active'

-- Jobs Search  
SELECT id, title, description, budget_amount, currency, cover_photo, location_address, user_id
FROM job_listings
WHERE (title ILIKE '%query%' OR description ILIKE '%query%')
AND status = 'active'

-- Users Search
SELECT id, full_name, bio, avatar_url
FROM profiles
WHERE (full_name ILIKE '%query%' OR bio ILIKE '%query%')
```

### Performance Optimizations

1. **Debounced Queries** - 300ms delay prevents excessive API calls
2. **Result Limits** - Auto-complete limited to 8 results, search to 20
3. **Indexed Columns** - Ensure database indexes on searchable fields
4. **Caching** - Popular terms cached for better performance

## Usage Examples

### Basic Search Bar
```tsx
import SearchBarWithAutoComplete from '@/components/SearchBarWithAutoComplete';

<SearchBarWithAutoComplete
  placeholder="Search services..."
  onSearch={(query) => console.log('Search:', query)}
/>
```

### Custom Suggestion Handling
```tsx
<SearchBarWithAutoComplete
  onSuggestionSelect={(suggestion) => {
    if (suggestion.type === 'service') {
      router.push(`/service/${suggestion.id}`);
    }
  }}
/>
```

### Search Results Integration
```tsx
// Navigate to search results
router.push(`/search?q=${encodeURIComponent(query)}`);

// With category filter
router.push(`/search?q=${query}&category=${category}`);
```

## Search Result Types

### SearchSuggestion Interface
```typescript
interface SearchSuggestion {
  id: string;
  type: 'service' | 'category' | 'location' | 'user' | 'job';
  title: string;
  subtitle?: string;
  image_url?: string;
  category?: string;
  location?: string;
  user_id?: string;
  rating?: number;
  price?: number;
  currency?: string;
}
```

### Navigation Logic
- **Service** → `/service/[id]`
- **Job** → `/job/[id]`
- **User** → `/profile/[id]`
- **Category** → `/search?category=[name]`
- **Location** → `/search?location=[name]`

## Implementation Details

### Auto-Complete Flow
1. User types in search bar
2. 300ms debounce timer starts
3. Query sent to `SearchService.getAutoCompleteSuggestions()`
4. Results displayed in modal overlay
5. User selects suggestion or presses search
6. Navigation occurs based on selection type

### Search Results Flow
1. User performs search (via suggestion or manual)
2. Query saved to recent searches
3. Navigate to `/search` page with query parameter
4. `SearchService.search()` called with filters
5. Results displayed in tabbed interface

### Recent Searches
- Stored in AsyncStorage with key `recent_searches`
- Maximum 10 searches maintained
- Automatic deduplication (recent searches moved to top)
- Displayed when search bar is focused with empty query

## Customization

### Adding New Search Types
1. Update `SearchSuggestion` interface
2. Add database query in `SearchService.getAutoCompleteSuggestions()`
3. Add navigation logic in `SearchBarWithAutoComplete`
4. Update search results page rendering

### Styling
All components use the theme system:
```tsx
const colors = useColors();
// Use colors.primary.main, colors.text.primary, etc.
```

### Search Filters
Extend `SearchFilters` interface:
```typescript
interface SearchFilters {
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  type?: 'service' | 'job' | 'user';
}
```

## Performance Considerations

### Database Optimization
1. **Indexes** - Create indexes on searchable columns:
   ```sql
   CREATE INDEX idx_services_search ON services USING gin(to_tsvector('english', title || ' ' || description));
   CREATE INDEX idx_services_category ON services(category_name);
   CREATE INDEX idx_services_location ON services(location);
   ```

2. **Full-Text Search** - Consider PostgreSQL full-text search for better performance:
   ```sql
   SELECT * FROM services 
   WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', 'query');
   ```

### Client-Side Optimization
1. **Debouncing** - Prevents excessive API calls
2. **Result Caching** - Cache popular terms and recent searches
3. **Lazy Loading** - Load more results on scroll
4. **Image Optimization** - Use optimized image URLs

## Testing

### Test Cases
1. **Auto-complete functionality**
   - Type 2+ characters → suggestions appear
   - Type 1 character → no suggestions
   - Clear input → show recent/popular terms

2. **Search navigation**
   - Service suggestion → opens service page
   - User suggestion → opens profile page
   - Category suggestion → opens filtered search

3. **Recent searches**
   - Search term saved after search
   - Recent terms appear when focused
   - Maximum 10 terms maintained

4. **Performance**
   - Suggestions load within 500ms
   - No duplicate API calls during typing
   - Smooth scrolling in results

### Manual Testing
```bash
# Test auto-complete
1. Open app and focus search bar
2. Type "clean" - should show cleaning services
3. Type "photo" - should show photography services
4. Select a suggestion - should navigate correctly

# Test recent searches
1. Perform several searches
2. Focus search bar with empty input
3. Should show recent searches
4. Tap recent search - should perform search
```

## Future Enhancements

1. **Voice Search** - Add speech-to-text capability
2. **Search Analytics** - Track popular searches and user behavior
3. **Personalized Results** - Show results based on user preferences
4. **Geolocation** - Prioritize nearby results
5. **Search Filters UI** - Add visual filter interface
6. **Saved Searches** - Allow users to save and manage searches
7. **Search Suggestions API** - External search suggestion service
8. **Typo Tolerance** - Handle misspellings and typos
9. **Search History Sync** - Sync across devices for logged-in users
10. **Advanced Filters** - Price range, ratings, availability, etc.

## Troubleshooting

### Common Issues

1. **No suggestions appearing**
   - Check database connection
   - Verify search service is working
   - Check console for errors

2. **Slow suggestions**
   - Add database indexes
   - Reduce debounce time
   - Optimize queries

3. **Navigation not working**
   - Check route definitions in `app/_layout.tsx`
   - Verify suggestion type handling

4. **Recent searches not persisting**
   - Check AsyncStorage permissions
   - Verify hook implementation
   - Check for storage errors in console

### Debug Mode
Enable debug logging in SearchService:
```typescript
const DEBUG = __DEV__;
if (DEBUG) console.log('Search query:', query, 'Results:', results);
```