# Design Document

## Overview

This design outlines the comprehensive approach to replace all instances of "seller" terminology with "service provider" throughout the application. The change affects multiple layers including the user interface, database schema, API responses, TypeScript interfaces, and business logic. The design ensures data integrity is maintained while providing a seamless transition to the new terminology.

## Architecture

### Affected Components

1. **Database Layer**
   - Column names in multiple tables
   - Database functions and stored procedures
   - Row Level Security (RLS) policies
   - Database indexes

2. **API Layer**
   - Service classes and methods
   - TypeScript interfaces and types
   - Function parameters and return values

3. **Frontend Layer**
   - React components and props
   - UI text and labels
   - Navigation and routing
   - Form fields and validation

4. **Business Logic Layer**
   - Service classes
   - Utility functions
   - Data transformation logic

## Components and Interfaces

### Database Schema Changes

#### Tables Requiring Column Renames

1. **job_proposals table**
   - `seller_id` → `service_provider_id`
   - Related indexes and foreign keys

2. **active_jobs table**
   - `seller_id` → `service_provider_id`

3. **job_completion_photos table**
   - `seller_id` → `service_provider_id`

4. **service_offers table**
   - `seller_id` → `service_provider_id`

5. **orders table**
   - `seller_id` → `service_provider_id`

6. **user_profiles table**
   - `is_seller` → `is_service_provider`
   - `seller_badge` → `service_provider_badge`
   - `seller_badge_subtitle` → `service_provider_badge_subtitle`
   - `seller_description` → `service_provider_description`

#### Database Functions Requiring Updates

1. **mark_work_completed function**
   - Parameter `p_seller_id` → `p_service_provider_id`

2. **RLS Policies**
   - Update all policies referencing `seller_id` to use `service_provider_id`
   - Update policy descriptions and comments

#### Index Updates

- `idx_job_proposals_seller_id` → `idx_job_proposals_service_provider_id`
- All other indexes referencing seller columns

### TypeScript Interface Changes

#### Core Interfaces

1. **JobProposal interface**
   ```typescript
   interface JobProposal {
     seller_id: string; // → service_provider_id: string
     seller_profile?: Profile; // → service_provider_profile?: Profile
   }
   ```

2. **ActiveJob interface**
   ```typescript
   interface ActiveJob {
     seller_id: string; // → service_provider_id: string
   }
   ```

3. **ServiceOfferData interface**
   ```typescript
   interface ServiceOfferData {
     sellerId: string; // → serviceProviderId: string
   }
   ```

4. **UserProfile interface**
   ```typescript
   interface UserProfile {
     is_seller: boolean; // → is_service_provider: boolean
     seller_badge?: string; // → service_provider_badge?: string
     seller_badge_subtitle?: string; // → service_provider_badge_subtitle?: string
     seller_description?: string; // → service_provider_description?: string
   }
   ```

### Service Class Changes

#### Method Signatures

1. **PaymentService**
   - `processPayment(serviceData, buyerId, sellerId)` → `processPayment(serviceData, buyerId, serviceProviderId)`

2. **JobService**
   - `getSellerProposals(sellerId)` → `getServiceProviderProposals(serviceProviderId)`

3. **JobCompletionService**
   - `uploadCompletionPhotos(jobStatusId, sellerId, photos)` → `uploadCompletionPhotos(jobStatusId, serviceProviderId, photos)`
   - `completeJobWithPhotos(jobStatusId, sellerId, photos)` → `completeJobWithPhotos(jobStatusId, serviceProviderId, photos)`

4. **ChatService**
   - `createServiceOffer(chatId, serviceId, sellerId, buyerId)` → `createServiceOffer(chatId, serviceId, serviceProviderId, buyerId)`

### UI Component Changes

#### Text and Labels

1. **Navigation and Buttons**
   - "Become a Seller" → "Become a Service Provider"
   - "Seller" → "Service Provider"
   - "seller" → "service provider"

2. **Profile Components**
   - "verified seller" → "verified service provider"
   - "Seller status" → "Service provider status"

3. **Form Labels**
   - All form fields referencing seller terminology

#### Component Props

1. **PaymentModal and MalaysianPaymentModal**
   - `sellerId` prop → `serviceProviderId`

2. **OrderCard**
   - `isSeller` variable → `isServiceProvider`

### File and Route Changes

1. **File Renames**
   - `app/become-seller.tsx` → `app/become-service-provider.tsx`

2. **Route Updates**
   - `/become-seller` → `/become-service-provider`

## Data Models

### Migration Strategy

The database migration will use a multi-step approach to ensure zero downtime:

1. **Phase 1: Add New Columns**
   - Add new columns with service_provider naming alongside existing seller columns
   - Copy data from old columns to new columns
   - Update application code to write to both old and new columns

2. **Phase 2: Update Application Code**
   - Update all application code to read from new columns
   - Update all TypeScript interfaces
   - Update all UI components

3. **Phase 3: Remove Old Columns**
   - Drop old seller columns after confirming new columns work correctly
   - Update RLS policies and indexes
   - Clean up any remaining references

### Data Integrity Measures

1. **Foreign Key Constraints**
   - Ensure all foreign key relationships are maintained during column renames
   - Update constraint names to reflect new terminology

2. **Index Maintenance**
   - Recreate indexes with new column names
   - Ensure query performance is maintained

3. **Data Validation**
   - Verify data consistency before and after migration
   - Run validation queries to ensure no data loss

## Error Handling

### Migration Error Handling

1. **Rollback Strategy**
   - Maintain ability to rollback database changes if issues occur
   - Keep old columns temporarily during transition period

2. **Application Error Handling**
   - Update error messages to use new terminology
   - Ensure error handling logic works with new field names

3. **Validation Updates**
   - Update form validation to use new field names
   - Ensure validation messages use correct terminology

## Testing Strategy

### Database Testing

1. **Migration Testing**
   - Test migration scripts on development database
   - Verify data integrity before and after migration
   - Test rollback procedures

2. **Performance Testing**
   - Ensure query performance is maintained with new indexes
   - Test database function performance with new parameter names

### Application Testing

1. **Unit Testing**
   - Update all unit tests to use new terminology
   - Test service classes with new method signatures
   - Test TypeScript interfaces with new property names

2. **Integration Testing**
   - Test complete user flows with new terminology
   - Test API endpoints with new field names
   - Test database interactions with new column names

3. **UI Testing**
   - Test all UI components display correct terminology
   - Test form submissions with new field names
   - Test navigation with updated routes

### End-to-End Testing

1. **User Flow Testing**
   - Test complete "become service provider" flow
   - Test service creation and management flows
   - Test payment and order flows
   - Test job proposal and completion flows

2. **Cross-Platform Testing**
   - Test on web and mobile platforms
   - Ensure consistent terminology across all platforms

### Regression Testing

1. **Functionality Testing**
   - Ensure all existing functionality works with new terminology
   - Test edge cases and error scenarios
   - Verify data consistency across all operations

2. **Performance Testing**
   - Ensure application performance is not degraded
   - Test database query performance
   - Test API response times