# Payment Release Flow - Complete Process

## 🔄 **What Happens When Admin Clicks "Release Payment"**

### **Step 1: User Interface Flow**

```typescript
// 1. Admin clicks "Release Payment" button on job card
onPress={() => confirmPaymentRelease(item)}

// 2. Confirmation dialog shows with fee breakdown
Alert.alert(
  'Confirm Payment Release',
  `Are you sure you want to release payment for "${job.title}"?

Original Amount: ${job.price} ${job.currency}
Platform Fee (2.2%): -${(job.price * 0.022).toFixed(2)} ${job.currency}
Service Fee (11%): -${(job.price * 0.11).toFixed(2)} ${job.currency}
Final Payout: ${finalPayout.toFixed(2)} ${job.currency}

Service Provider: ${job.service_provider_name}
Bank: ${job.bank_name}
Account: ${job.bank_account_number}
Holder: ${job.bank_account_holder}`
)

// 3. If admin confirms, processPaymentRelease() is called
const result = await PaymentReleaseService.releasePayment(
  job.id,
  job.table_source,
  user?.id || ''
);
```

### **Step 2: Database Updates by Table Source**

## 📊 **Database Updates**

### **For `active_jobs` Table:**
```sql
UPDATE active_jobs 
SET 
  status = 'completed_confirmed',
  payment_status = 'released',
  payment_released_at = '2025-08-29T00:30:00.000Z',
  admin_release_by = 'admin_user_id',
  updated_at = '2025-08-29T00:30:00.000Z'
WHERE id = 'job_id';
```

**Fields Updated:**
- `status`: `'payment_release_in_progress'` → `'completed_confirmed'`
- `payment_status`: `'paid'` → `'released'`
- `payment_released_at`: `NULL` → Current timestamp
- `admin_release_by`: `NULL` → Admin user ID
- `updated_at`: Previous timestamp → Current timestamp

### **For `orders` Table:**
```sql
UPDATE orders 
SET 
  status = 'completed',
  payment_released_at = '2025-08-29T00:30:00.000Z',
  admin_resolved_by = 'admin_user_id',
  admin_resolved_at = '2025-08-29T00:30:00.000Z',
  updated_at = '2025-08-29T00:30:00.000Z'
WHERE id = 'order_id';
```

**Fields Updated:**
- `status`: `'payment_release_in_progress'` → `'completed'`
- `payment_released_at`: `NULL` → Current timestamp
- `admin_resolved_by`: `NULL` → Admin user ID
- `admin_resolved_at`: `NULL` → Current timestamp
- `updated_at`: Previous timestamp → Current timestamp

### **For `escrow_transactions` Table:**
```sql
-- 1. Update escrow status
UPDATE escrow_transactions 
SET 
  status = 'released',
  payment_release_date = '2025-08-29T00:30:00.000Z',
  updated_at = '2025-08-29T00:30:00.000Z'
WHERE id = 'escrow_id';

-- 2. Update service provider's wallet
UPDATE wallets 
SET 
  betame_betacoins = betame_betacoins + 434,  -- (500 - 66 platform_fee)
  updated_at = '2025-08-29T00:30:00.000Z'
WHERE user_id = 'service_provider_id';

-- 3. Create transaction record
INSERT INTO transactions (
  user_id,
  type,
  amount,
  description,
  created_at
) VALUES (
  'service_provider_id',
  'service_payment_received',
  434,
  'Payment received for "Job Title" (Admin Released)',
  '2025-08-29T00:30:00.000Z'
);
```

**Fields Updated:**
- `status`: `'held'` → `'released'`
- `payment_release_date`: `NULL` → Current timestamp
- `updated_at`: Previous timestamp → Current timestamp
- **Wallet**: BetaCoins balance increased by payout amount
- **Transaction**: New record created for audit trail

## 📱 **Step 3: Notification Creation**

```sql
INSERT INTO notifications (
  user_id,
  title,
  message,
  type,
  data,
  created_at
) VALUES (
  'service_provider_id',
  '💰 Payment Released!',
  'Your payment of 8.87 RM for "Service Offer" has been released by admin.',
  'order',
  '{
    "orderId": "job_id",
    "jobTitle": "Service Offer",
    "amount": 8.87,
    "currency": "RM",
    "action_type": "admin_payment_released",
    "table_source": "active_jobs"
  }',
  '2025-08-29T00:30:00.000Z'
);
```

## 🎯 **Real Example with Current Data**

### **Current Job in System:**
- **Job ID**: `b2a93208-88b0-4f34-a06f-e1ff0b6c491a`
- **Title**: "Service Offer"
- **Service Provider**: "Akmal B Razak"
- **Original Amount**: RM 10.22
- **Table Source**: `active_jobs`

### **When Admin Releases Payment:**

**1. Database Update:**
```sql
UPDATE active_jobs 
SET 
  status = 'completed_confirmed',
  payment_status = 'released',
  payment_released_at = '2025-08-29T00:30:00.000Z',
  admin_release_by = 'admin_user_id',
  updated_at = '2025-08-29T00:30:00.000Z'
WHERE id = 'b2a93208-88b0-4f34-a06f-e1ff0b6c491a';
```

**2. Fee Calculation:**
- Original Amount: RM 10.22
- Platform Fee (2.2%): -RM 0.22
- Service Fee (11%): -RM 1.12
- **Final Payout**: RM 8.87

**3. Notification Sent:**
```json
{
  "user_id": "akmal_user_id",
  "title": "💰 Payment Released!",
  "message": "Your payment of 8.87 RM for 'Service Offer' has been released by admin.",
  "type": "order",
  "data": {
    "orderId": "b2a93208-88b0-4f34-a06f-e1ff0b6c491a",
    "jobTitle": "Service Offer",
    "amount": 8.87,
    "currency": "RM",
    "action_type": "admin_payment_released",
    "table_source": "active_jobs"
  }
}
```

## 🔍 **How to Check Status Updates**

### **Query to Check Job Status:**
```sql
SELECT 
  id,
  title,
  status,
  payment_status,
  payment_released_at,
  admin_release_by,
  updated_at
FROM active_jobs 
WHERE id = 'b2a93208-88b0-4f34-a06f-e1ff0b6c491a';
```

### **Query to Check Notifications:**
```sql
SELECT 
  title,
  message,
  created_at,
  data
FROM notifications 
WHERE user_id = 'service_provider_id' 
  AND data->>'action_type' = 'admin_payment_released'
ORDER BY created_at DESC;
```

### **Query to Check Transaction History (for escrow):**
```sql
SELECT 
  type,
  amount,
  description,
  created_at
FROM transactions 
WHERE user_id = 'service_provider_id' 
  AND type = 'service_payment_received'
ORDER BY created_at DESC;
```

## ⚡ **Summary of Changes**

When admin clicks "Release Payment":

1. **Job Status**: `payment_release_in_progress` → `completed_confirmed`
2. **Payment Status**: `paid` → `released`
3. **Timestamps**: `payment_released_at` and `admin_release_by` are set
4. **Wallet Update**: (Only for escrow) BetaCoins added to service provider
5. **Transaction Record**: (Only for escrow) Payment record created
6. **Notification**: Service provider gets notified about payment release
7. **UI Update**: Job disappears from Payment Release list
8. **Admin Audit**: Admin action is logged with user ID and timestamp

The job will no longer appear in the Payment Release page since its status has changed from `payment_release_in_progress` to a completed state.