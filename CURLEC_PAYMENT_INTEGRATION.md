# Curlec Payment Gateway Integration

This document provides a comprehensive guide for the Curlec payment gateway integration in the BetaMe app.

## Overview

The Curlec payment gateway has been integrated to handle all payment transactions in the BetaMe app, including:
- BetaCoin purchases
- Service payments
- Wallet topups

## Features

### ✅ Implemented Features
- **Payment Processing**: Secure payment processing through Curlec
- **Multiple Payment Types**: Support for BetaCoin purchases, service payments, and wallet topups
- **Webhook Handling**: Automatic payment status updates via webhooks
- **Transaction History**: Complete payment transaction tracking
- **User Interface**: Modern, responsive payment UI components
- **Error Handling**: Comprehensive error handling and user feedback
- **Security**: Encrypted payment processing with signature verification

### 🔧 Technical Features
- **Database Integration**: Full integration with Supabase database
- **Real-time Updates**: Payment status updates in real-time
- **Mobile Optimized**: Responsive design for mobile devices
- **Deep Linking**: Seamless navigation between payment pages
- **Environment Support**: Sandbox and production environment support

## Database Schema

### Payment Tables

#### `payment_transactions`
Stores all payment transaction records.

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('betacoin_purchase', 'service_payment', 'wallet_topup')),
  amount INTEGER NOT NULL, -- Amount in cents (RM * 100)
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  curlec_payment_id TEXT,
  curlec_checkout_id TEXT,
  payment_method TEXT,
  payment_gateway TEXT NOT NULL DEFAULT 'curlec',
  gateway_response JSONB,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `betacoin_packages`
Stores BetaCoin package configurations.

```sql
CREATE TABLE betacoin_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  betacoin_amount INTEGER NOT NULL,
  price INTEGER NOT NULL, -- Price in cents (RM * 100)
  currency TEXT NOT NULL DEFAULT 'MYR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `payment_methods`
Stores user payment methods (for future use).

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_type TEXT NOT NULL CHECK (payment_method_type IN ('card', 'fpx', 'ewallet')),
  payment_method_name TEXT NOT NULL,
  payment_method_id TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# Curlec Payment Gateway Configuration
EXPO_PUBLIC_CURLEC_API_KEY=rzp_test_R9Zq5e24ydHz2T
CURLEC_SECRET_KEY=<REDACTED>
CURLEC_WEBHOOK_SECRET=<REDACTED>
EXPO_PUBLIC_CURLEC_ENVIRONMENT=sandbox
EXPO_PUBLIC_APP_URL=https://your-app-domain.com
```

### Environment Variables Explained

- `EXPO_PUBLIC_CURLEC_API_KEY`: Your Curlec API key (public)
- `CURLEC_SECRET_KEY`: Your Curlec secret key (private)
- `CURLEC_WEBHOOK_SECRET`: Webhook signature verification secret
- `EXPO_PUBLIC_CURLEC_ENVIRONMENT`: Set to 'sandbox' for testing, 'production' for live
- `EXPO_PUBLIC_APP_URL`: Your app's base URL for payment redirects

## Setup Instructions

### 1. Curlec Account Setup

1. **Create Curlec Account**: Sign up at [https://dashboard.curlec.com/](https://dashboard.curlec.com/)
2. **Get API Keys**: Navigate to API settings and generate your API keys
3. **Configure Webhooks**: Set up webhook endpoint for payment notifications
4. **Test Environment**: Use sandbox environment for testing

### 2. Database Setup

The database tables are automatically created when you run the migrations. The sample BetaCoin packages are also inserted automatically.

### 3. Webhook Configuration

Configure your Curlec webhook endpoint to point to:
```
https://your-app-domain.com/api/webhooks/curlec
```

### 4. App Configuration

1. Update your `.env` file with Curlec credentials
2. Ensure your app URL is correctly configured
3. Test the integration in sandbox mode first

## Usage Examples

### BetaCoin Purchase

```typescript
import BetaCoinPurchaseModal from '../components/BetaCoinPurchaseModal';

// In your component
const [showPurchaseModal, setShowPurchaseModal] = useState(false);

<BetaCoinPurchaseModal
  visible={showPurchaseModal}
  onClose={() => setShowPurchaseModal(false)}
/>
```

### Service Payment

```typescript
import ServicePaymentModal from '../components/ServicePaymentModal';

// In your component
const [showPaymentModal, setShowPaymentModal] = useState(false);

<ServicePaymentModal
  visible={showPaymentModal}
  onClose={() => setShowPaymentModal(false)}
  orderId="order-123"
  serviceName="Cleaning Service"
  amount={5000} // RM50.00 in cents
  serviceProviderName="John Doe"
/>
```

### Payment Transaction History

```typescript
import PaymentTransactionHistory from '../components/PaymentTransactionHistory';

// In your component
<PaymentTransactionHistory
  onTransactionPress={(transaction) => {
    // Handle transaction selection
    console.log('Selected transaction:', transaction);
  }}
/>
```

### Direct API Usage

```typescript
import CurlecPaymentService from '../lib/curlec-payment-service';

const paymentService = CurlecPaymentService.getInstance();

// Create a checkout session
const response = await paymentService.createCheckoutSession({
  user_id: user.id,
  payment_type: 'betacoin_purchase',
  amount: 1000, // RM10.00 in cents
  currency: 'MYR',
  success_url: 'https://yourapp.com/payment/success',
  cancel_url: 'https://yourapp.com/payment/cancel',
  metadata: {
    betacoin_amount: 100,
    package_id: 'package-123'
  }
});

if (response.success) {
  // Redirect to payment page
  window.location.href = response.checkout_url;
}
```

## Payment Flow

### 1. BetaCoin Purchase Flow

1. User selects BetaCoin package
2. App creates payment transaction record
3. Curlec checkout session is created
4. User is redirected to Curlec payment page
5. User completes payment
6. Curlec sends webhook notification
7. App processes payment and adds BetaCoins to wallet
8. User is redirected to success page

### 2. Service Payment Flow

1. User initiates service payment
2. App creates payment transaction record
3. Curlec checkout session is created
4. User is redirected to Curlec payment page
5. User completes payment
6. Curlec sends webhook notification
7. App processes payment and updates order status
8. User is redirected to success page

## Webhook Processing

The webhook handler processes the following events:

- `payment.completed`: Payment was successful
- `payment.failed`: Payment failed
- `payment.cancelled`: Payment was cancelled

### Webhook Security

Webhooks are verified using signature verification to ensure they come from Curlec.

## Error Handling

The integration includes comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Payment Failures**: User-friendly error messages
- **Webhook Errors**: Logging and alerting for failed webhooks
- **Database Errors**: Transaction rollback and error recovery

## Security Considerations

### ✅ Implemented Security Measures

1. **API Key Protection**: Secret keys are stored server-side only
2. **Webhook Verification**: Signature verification for webhook authenticity
3. **HTTPS Only**: All payment communications use HTTPS
4. **Input Validation**: All inputs are validated and sanitized
5. **Database Security**: RLS policies protect user data
6. **Error Handling**: No sensitive data in error messages

### 🔒 Additional Security Recommendations

1. **Rate Limiting**: Implement rate limiting on payment endpoints
2. **Monitoring**: Set up monitoring for suspicious payment patterns
3. **Audit Logging**: Log all payment-related activities
4. **PCI Compliance**: Ensure compliance with PCI DSS if handling card data

## Testing

### Sandbox Testing

1. Use Curlec sandbox environment for testing
2. Test all payment scenarios (success, failure, cancellation)
3. Verify webhook processing
4. Test error handling and edge cases

### Test Cards

Use Curlec's test card numbers for sandbox testing:
- **Visa**: 4242424242424242
- **Mastercard**: 5555555555554444
- **American Express**: 378282246310005

### Test Scenarios

1. **Successful Payment**: Complete payment flow
2. **Failed Payment**: Test with invalid card
3. **Cancelled Payment**: Cancel payment process
4. **Network Errors**: Test with poor connectivity
5. **Webhook Failures**: Test webhook processing

## Monitoring and Logging

### Payment Monitoring

Monitor the following metrics:
- Payment success rate
- Average payment processing time
- Failed payment reasons
- Webhook delivery success rate

### Logging

All payment activities are logged with:
- Transaction IDs
- User IDs
- Payment amounts
- Status changes
- Error details

## Troubleshooting

### Common Issues

#### 1. Payment Session Creation Fails
- Check API key configuration
- Verify environment settings
- Check network connectivity

#### 2. Webhook Not Received
- Verify webhook URL configuration
- Check webhook signature verification
- Ensure webhook endpoint is accessible

#### 3. Payment Status Not Updated
- Check webhook processing
- Verify database connectivity
- Check transaction record creation

#### 4. BetaCoins Not Added
- Check webhook processing
- Verify wallet service integration
- Check transaction metadata

### Debug Steps

1. **Check Logs**: Review application logs for errors
2. **Verify Configuration**: Ensure all environment variables are set
3. **Test Connectivity**: Verify API connectivity
4. **Check Database**: Verify transaction records
5. **Monitor Webhooks**: Check webhook delivery status

## Support

For issues related to:
- **Curlec Integration**: Check this documentation
- **Curlec API**: Contact Curlec support
- **App Issues**: Check application logs and error handling

## Future Enhancements

### Planned Features
- [ ] Recurring payments
- [ ] Payment method storage
- [ ] Refund processing
- [ ] Payment analytics
- [ ] Multi-currency support

### Potential Improvements
- [ ] Offline payment support
- [ ] Payment scheduling
- [ ] Advanced fraud detection
- [ ] Payment optimization

## Changelog

### Version 1.0.0 (Current)
- Initial Curlec integration
- BetaCoin purchase support
- Service payment support
- Webhook processing
- Transaction history
- Payment UI components

---

For more information, refer to the [Curlec API Documentation](https://docs.curlec.com/).
