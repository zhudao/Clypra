# Network Error Handling for Media Tabs

## Overview

Added comprehensive network error detection and handling for all media tabs that fetch data from external APIs (Audio, Stickers, Text). When network connectivity is lost, users see a clean error UI with a reload button instead of generic error messages.

---

## Implementation

### 1. NetworkError Component

**File:** `/src/components/ui/NetworkError.tsx`

Reusable component that displays:

- Alert circle icon in a bordered circle
- Custom error message (default: "No internet connection")
- Cyan "Reload" button with refresh icon

```typescript
<NetworkError
  message="No internet connection."
  onRetry={fetchFunction}
/>
```

**Features:**

- Clean, centered layout
- Consistent with app design system
- Accessible reload button
- Customizable message

---

### 2. Network Error Detection

Each tab now detects network-related errors by checking error messages for keywords:

- `network`
- `fetch`
- `connection`
- `offline`

**Pattern:**

```typescript
const [isNetworkError, setIsNetworkError] = useState(false);

const fetchData = () => {
  // ... fetch logic
  .catch((err) => {
    const errorMessage = err instanceof Error ? err.message : "Failed to load";
    setError(errorMessage);

    // Detect network errors
    const isNetwork = errorMessage.toLowerCase().includes("network") ||
                     errorMessage.toLowerCase().includes("fetch") ||
                     errorMessage.toLowerCase().includes("connection") ||
                     errorMessage.toLowerCase().includes("offline");
    setIsNetworkError(isNetwork);
  });
};
```

---

## Updated Tabs

### ✅ AudioTab

**File:** `/src/components/editor/media-tabs/AudioTab.tsx`

- Added `isNetworkError` state
- Created `fetchAudio()` function for retry capability
- Shows `NetworkError` component when network is down
- Shows generic error box for other errors

**Changes:**

```typescript
// Before
{!loading && error && (
  <div className="error-box">{error}</div>
)}

// After
{!loading && error && isNetworkError && (
  <NetworkError message="No internet connection." onRetry={fetchAudio} />
)}

{!loading && error && !isNetworkError && (
  <div className="error-box">{error}</div>
)}
```

---

### ✅ StickersTab

**File:** `/src/components/editor/media-tabs/StickersTab.tsx`

- Added `isNetworkError` state
- Created `fetchStickers()` function for retry capability
- Shows `NetworkError` component when network is down
- Shows generic error box for other errors

**Same pattern as AudioTab**

---

### ⏭️ TextTab

**File:** `/src/components/editor/media-tabs/TextTab.tsx`

**Status:** No changes needed

TextTab already has its own API connection state management:

- `isTemplatesApiConnected`
- `isEffectsApiConnected`
- Custom UI for connection status

---

### ⏭️ EffectsTab, FiltersTab, TransitionsTab

**Status:** No changes needed

These tabs use **static preset data** (`EFFECT_PRESETS`, `FILTER_PRESETS`, `TRANSITION_PRESETS`) and don't make network requests, so network error handling is not applicable.

---

## User Experience

### Before (Generic Error)

```
❌ [Alert Icon] Failed to load audio library
```

### After (Network Error)

```
⚠️  (in circle)

No internet connection.

[🔄 Reload]  (cyan button)
```

---

## Benefits

1. **Clear Communication** - Users immediately understand the issue is network-related
2. **Self-Service Recovery** - Reload button allows users to retry without restarting
3. **Consistent UX** - Same pattern across Audio and Stickers tabs
4. **Progressive Enhancement** - Generic errors still work for non-network issues
5. **Visual Hierarchy** - Large icon and clear message draw attention

---

## Testing

### Network Error Scenarios

1. **Offline Mode**
   - Turn off WiFi/Ethernet
   - Open Audio or Stickers tab
   - Should show NetworkError component

2. **API Down**
   - If API returns connection error
   - Should show NetworkError component

3. **Reload Functionality**
   - Click "Reload" button
   - Should trigger fetch again
   - Should show loading state
   - Should recover if network is back

4. **Other Errors**
   - If API returns 404, 500, or other non-network error
   - Should show generic error box (red background)

---

## Code Pattern

### For Any New Tab with API Calls

```typescript
import { NetworkError } from "@/components/ui/NetworkError";

export const MyTab: React.FC<TabProps> = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    setIsNetworkError(false);

    MyApi.getData()
      .then((data) => {
        // Handle data
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : "Failed to load";
        setError(errorMessage);

        // Detect network errors
        const isNetwork = errorMessage.toLowerCase().includes("network") ||
                         errorMessage.toLowerCase().includes("fetch") ||
                         errorMessage.toLowerCase().includes("connection") ||
                         errorMessage.toLowerCase().includes("offline");
        setIsNetworkError(isNetwork);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      {/* ... header ... */}

      <div className="content">
        {loading && <LoadingSpinner />}

        {!loading && error && isNetworkError && (
          <NetworkError message="No internet connection." onRetry={fetchData} />
        )}

        {!loading && error && !isNetworkError && (
          <div className="error-box">
            <AlertCircle />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && data.map(...)}
      </div>
    </>
  );
};
```

---

## Design System Consistency

### NetworkError Component Styling

- **Icon**: 12x12 AlertCircle in bordered circle (48px diameter)
- **Message**: Base text size, muted color
- **Button**: Accent background, white text, rounded-lg, hover effect
- **Layout**: Centered vertically and horizontally, 16px vertical padding
- **Spacing**: 16px margin between icon and message, 24px margin before button

### Colors

- Icon border: `text-muted/20`
- Icon color: `text-muted`
- Message: `text-text-muted`
- Button background: `bg-accent`
- Button hover: `bg-accent/90`
- Button text: `text-white`

---

## Files Changed

### Created

- `/src/components/ui/NetworkError.tsx` - Reusable network error component

### Modified

- `/src/components/editor/media-tabs/AudioTab.tsx` - Added network error handling
- `/src/components/editor/media-tabs/StickersTab.tsx` - Added network error handling

---

## Future Enhancements

1. **Auto-retry** - Automatically retry after X seconds
2. **Connection Monitoring** - Use browser online/offline events
3. **Offline Mode** - Cache data for offline access
4. **Network Status Indicator** - Global network status in header
5. **Smart Retry** - Exponential backoff for retries
6. **Error Analytics** - Track network error frequency

---

**Status**: ✅ Complete and Tested

Network error handling is now live in AudioTab and StickersTab with a clean, user-friendly UI.
