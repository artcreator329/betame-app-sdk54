# Order Payment Flow Documentation

## Overview

This document describes the comprehensive order payment flow system implemented for the BetaMe app. The system handles the complete lifecycle of service orders from payment to completion, including dispute resolution and automatic payment release.

## System Architecture

### Database Tables

1. **orders** - Main order tracking table
2. **order_timeline** - Detailed event tracking for each order
3. **dispute_communications** - Communication during disputes
4. **temporary_payouts** - Temporary payout system until real payment gateway is ready

### Key Components

- **OrderManagementService** - Core service for order operations
- **OrderCard** - UI component for displaying orders
- **OrderTimelineModal** - Modal for viewing order history
- **Admin Order Management** - Admin panel for intervention cases

## Order Flow States

### 1. Payment Received (`payment_received`)
- Order is created when buyer makes payment
- Payment is held in escrow (temporary credit system)
- Seller can start work

### 2. Work in Progress (`work_in_progress`)
- Seller has started working on the order
- Buyer can track progress
- Seller can update status and communicate with buyer

### 3. Work Completed (`work_completed`)
- Seller marks work as completed
- Automatically transitions to buyer review period
- 24-hour countdown timer starts

### 4. Buyer Reviewing (`buyer_reviewing`)
- Buyer has 24 hours to review the work
- Two possible actions:
  - **Confirm completion** → Payment released to seller
  - **Raise dispute** → Order goes to dispute resolution
- If no action taken within 24 hours → Auto-release payment

### 5. Completed (`completed`)
- Work confirmed by buyer OR auto-released after 24 hours
- Payment released to seller via temporary payout system
- Order marked as successfully completed

### 6. Disputed (`disputed`)
- Buyer raised a dispute within 24-hour review period
- Requires admin intervention
- Payment remains in escrow until resolution

## Key Business Rules

### 1. Automatic Payment Release
- **Jobs that successfully finish and are confirmed by both parties are paid automatically**
- If buyer doesn't respond within 24 hours after work completion, payment is auto-released
- No disputes can be raised after 24-hour window expires

### 2. Dispute Handling
- **Jobs with disputes stay in-progress and payment is never released until resolved**
- Disputes can only be raised within 24 hours of work completion
- Once disputed, seller must rectify issues until job is completed satisfactorily
- Admin intervention required for all disputes

### 3. Refund System
- **Jobs ending with disputes allow buyer to choose:**
  - Store refund as prepaid credit (BetaCoins)
  - Request actual refund (when real payment gateway is ready)
- No refunds allowed after 24-hour dispute window closes

### 4. Admin Intervention
- **Partial payment scenarios require manual admin intervention**
- Admin can resolve disputes and determine payment distribution
- Admin can add notes and track resolution progress

## Technical Implementation

### Database Functions

#### `mark_work_completed(order_id, seller_id)`
- Transitions order from `work_in_progress` to `buyer_reviewing`
- Sets 24-hour auto-release timer
- Adds timeline event

#### `confirm_work_completion(order_id, buyer_id)`
- Transitions order to `completed`
- Triggers payment release
- Creates payout record

#### `raise_dispute(order_id, buyer_id, dispute_reason)`
- Only works within 24-hour window
- Sets order to `disputed` status
- Flags for admin intervention

#### `auto_release_payments()`
- Cron job function
- Processes all orders past 24-hour review period
- Returns count of released payments

### Temporary Payout System

Since the real payment gateway is still in development, we use a temporary payout system:

1. **BetaCoin Credits** - Default payout method
2. **Manual Transfer** - For admin-processed payouts
3. **Bank Transfer** - Placeholder for future implementation
4. **Digital Wallet** - Placeholder for future implementation

### Auto-Release Mechanism

A cron job (`scripts/auto-release-cron.js`) should run every hour to:
1. Check system health
2. Identify orders ready for auto-release
3. Process automatic payment releases
4. Log activities for monitoring

## API Usage Examples

### Creating an Order
```javascript
const order = await orderManagementService.createOrder({
  service_offer_id: 'offer-123',
  buyer_id: 'buyer-456',
  seller_id: 'seller-789',
  amount: 100,
  platform_fee: 10,
  service_title: 'Website Design',
  service_description: 'Complete website redesign'
});
```

### Seller Workflow
```javascript
// Start work
await orderManagementService.startWork(orderId, sellerId);

// Mark as completed
await orderManagementService.markWorkCompleted(orderId, sellerId);
```

### Buyer Workflow
```javascript
// Confirm completion
await orderManagementService.confirmWorkCompletion(orderId, buyerId);

// Or raise dispute
await orderManagementService.raiseDispute(orderId, buyerId, "Work doesn't match requirements");
```

### Admin Operations
```javascript
// Get orders needing intervention
const orders = await orderManagementService.getOrdersRequiringAdminIntervention();

// Process auto-release
const count = await orderManagementService.processAutoRelease();
```

## UI Components

### OrderCard
- Displays order status and details
- Shows countdown timer for review period
- Provides action buttons based on user role and order status
- Handles dispute raising and work confirmation

### OrderTimelineModal
- Shows complete order history
- Displays all events with timestamps
- Includes metadata for detailed tracking

### Admin Panel
- Three main views: Interventions, Payouts, Auto-Release
- Allows admin to add notes and track resolution
- Shows pending payouts and processing status

## Monitoring and Logging

### Order Timeline
Every significant event is logged in the `order_timeline` table:
- Order creation
- Work started/completed
- Buyer confirmations
- Disputes raised
- Payment releases
- Admin interventions

### Cron Job Monitoring
The auto-release cron job logs:
- Number of payments processed
- Execution duration
- System health checks
- Error tracking

## Testing

Use the test script to verify the complete flow:

```bash
node scripts/test-order-flow.js
```

This tests:
- Complete happy path (payment → work → completion → release)
- Dispute flow
- Auto-release mechanism
- Refund requests

## Security Considerations

### Row Level Security (RLS)
- Users can only view/modify orders they're involved in
- Admin functions require appropriate permissions
- Timeline and communications are protected

### Data Validation
- Order status transitions are validated
- Time-based restrictions enforced (24-hour dispute window)
- Amount validations prevent negative or invalid payments

## Future Enhancements

### Real Payment Gateway Integration
When the real payment gateway is ready:
1. Replace temporary payout system
2. Implement actual refund processing
3. Add payment method selection
4. Include transaction fees and currency conversion

### Advanced Features
- Milestone-based payments
- Escrow for partial payments
- Automated dispute resolution
- Integration with external arbitration services
- Real-time notifications for all status changes

## Deployment Checklist

1. **Database Setup**
   - [ ] Run `database/create_order_payment_flow.sql`
   - [ ] Verify all functions are created
   - [ ] Test RLS policies

2. **Cron Job Setup**
   - [ ] Deploy `scripts/auto-release-cron.js`
   - [ ] Configure to run every hour
   - [ ] Set up monitoring and alerting

3. **UI Integration**
   - [ ] Add orders screen to navigation
   - [ ] Test all user flows
   - [ ] Verify admin panel access

4. **Testing**
   - [ ] Run complete test suite
   - [ ] Test with real user accounts
   - [ ] Verify payment integration

5. **Monitoring**
   - [ ] Set up error tracking
   - [ ] Configure performance monitoring
   - [ ] Create admin dashboards

## Support and Maintenance

### Common Issues
1. **Orders stuck in review** - Check auto-release cron job
2. **Disputes not processing** - Verify admin intervention flags
3. **Payments not releasing** - Check payout system status

### Maintenance Tasks
- Monitor auto-release job performance
- Review dispute resolution times
- Analyze payment flow metrics
- Update business rules as needed

---

This system provides a robust foundation for order management while maintaining flexibility for future payment gateway integration.