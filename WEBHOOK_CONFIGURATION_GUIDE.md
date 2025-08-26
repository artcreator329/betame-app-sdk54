# Webhook Configuration Guide

## Issue Identified
The webhook is working correctly, but Supabase Edge Functions require authentication. Payment gateways (Curlec/Razorpay) cannot provide authorization headers, causing 401 errors.

## Solution
Configure the webhook URL in your Curlec/Razorpay dashboard to include the anon key as a query parameter.

### Webhook URL to Configure in Curlec/Razorpay Dashboard:

```
https://rkcfgebgpixgfvggbwmc.supabase.co/functions/v1/curlec-webhook?apikey=<REDACTED_JWT>
```

### Steps to Configure:

1. **Login to your Curlec/Razorpay Dashboard**
2. **Go to Settings > Webhooks**
3. **Add/Edit Webhook URL** with the URL above
4. **Select Events**: Enable `payment_link.paid` event
5. **Save Configuration**

### Alternative Solution (Recommended)
Modify the webhook function to accept the anon key from query parameters:

```typescript
// Get auth from query params if not in headers
const url = new URL(req.url)
const apikey = url.searchParams.get('apikey')

if (apikey) {
  // Use the provided API key for authentication
  req.headers.set('authorization', `Bearer ${apikey}`)
  req.headers.set('apikey', apikey)
}
```

## Testing
The webhook has been tested and works correctly when proper authentication is provided:

✅ **Job Creation**: Active jobs are created successfully  
✅ **Data Integrity**: All fields are populated correctly  
✅ **Duplicate Prevention**: Multiple calls don't create duplicate jobs  
✅ **Error Handling**: Proper error responses and logging  

## Current Status
- ✅ Webhook function is fixed and working
- ✅ Job creation logic is correct
- ❌ Authentication issue prevents real webhook calls
- 🔧 **Action Required**: Configure webhook URL in payment gateway dashboard

## Next Steps
1. Configure the webhook URL in your Curlec/Razorpay dashboard with the anon key
2. Test with a real payment to verify the complete flow
3. Monitor webhook logs for any issues

The webhook will then automatically create active jobs when service payments are completed.