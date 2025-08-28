# Dark Mode Service Card Fix

## Issue
Service cards in dark mode were displaying light gray text on white backgrounds, making them completely unreadable and ugly.

## Root Cause
The ServiceCard component had several hardcoded colors that didn't adapt to dark mode:
1. Card background was hardcoded to white (`#FFFFFF`)
2. Text colors were hardcoded to black and gray
3. Some elements like favorite button had hardcoded light backgrounds

## Solution Applied

### 1. Dynamic Card Background
- Removed hardcoded white background from card styles
- Applied `colors.background.secondary` dynamically to card container
- In dark mode: `#1a2332` (dark blue-gray)
- In light mode: `#e6f3ff` (light blue tint)

### 2. Text Color Improvements
- **Service Title**: Changed from `colors.text.secondary` to `colors.text.primary`
  - Dark mode: `#e2e8f0` (light gray-blue) - much more visible
  - Light mode: `#1a365d` (dark blue)
- **Service Description**: Changed from `colors.text.secondary` to `colors.text.primary`
- **Category Text**: Changed from `colors.text.secondary` to `colors.text.primary`
- **Provider Name**: Already using `colors.text.primary` ✓
- **Price**: Already using `colors.text.primary` ✓

### 3. Interactive Elements
- **Favorite Button**: Now uses dynamic background colors
  - Unfavorited: `colors.background.tertiary`
  - Favorited: `#FF3B30` (red)
- **Profile Toggle**: Already using `colors.background.secondary` ✓

### 4. Variant Cards (if used)
- Background: `colors.background.primary` with `colors.border.light` border
- Text colors: All using `colors.text.primary` for better contrast

## Color Values in Dark Mode
- `colors.background.secondary`: `#1a2332` (dark blue-gray for cards)
- `colors.background.tertiary`: `#243447` (lighter dark blue for contrast)
- `colors.text.primary`: `#e2e8f0` (light gray-blue for primary text)
- `colors.text.secondary`: `#94a3b8` (medium gray-blue for secondary text)

## Result
Service cards now have proper contrast in dark mode:
- Dark blue-gray card backgrounds
- Light gray-blue text that's easily readable
- Proper contrast ratios for accessibility
- Consistent with the app's dark theme design