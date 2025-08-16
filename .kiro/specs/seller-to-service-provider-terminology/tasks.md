# Implementation Plan

- [x] 1. Create database migration for terminology changes
  - Create comprehensive SQL migration script to rename all seller-related columns to service_provider equivalents
  - Update all database functions, RLS policies, and indexes to use new terminology
  - Ensure data integrity is maintained during the migration process
  - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 5.4_

- [x] 2. Update TypeScript interfaces and types
  - Modify all TypeScript interfaces to replace seller properties with serviceProvider equivalents
  - Update type definitions in types/ directory to use new terminology
  - Ensure all interface properties maintain their data types and optional/required status
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Update service classes and business logic
- [x] 3.1 Update PaymentService class
  - Modify PaymentService.processPayment method to use serviceProviderId parameter instead of sellerId
  - Update all internal variable names and database queries to use service_provider terminology
  - Update error messages and logging to use new terminology
  - _Requirements: 3.2, 3.4_

- [x] 3.2 Update JobService class
  - Rename getSellerProposals method to getServiceProviderProposals
  - Update all database queries to use service_provider_id column names
  - Update method parameters and return types to use new terminology
  - _Requirements: 3.2, 3.4_

- [x] 3.3 Update JobCompletionService class
  - Update uploadCompletionPhotos method to use serviceProviderId parameter
  - Update completeJobWithPhotos method to use serviceProviderId parameter
  - Update all database operations to use service_provider_id column names
  - _Requirements: 3.2, 3.4_

- [x] 3.4 Update ChatService class
  - Update createServiceOffer method to use serviceProviderId parameter
  - Update all database operations and message creation logic
  - Update variable names throughout the service class
  - _Requirements: 3.2, 3.4_

- [x] 3.5 Update AuthService class
  - Update user profile merging logic to use is_service_provider field
  - Update service_provider_badge, service_provider_badge_subtitle, and service_provider_description fields
  - Update becomeSeller method name and logic to becomeServiceProvider
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 4. Update React components and UI
- [x] 4.1 Rename and update become-seller page
  - Rename app/become-seller.tsx to app/become-service-provider.tsx
  - Update all text content to use "service provider" terminology
  - Update database operations to use is_service_provider field
  - Update route references throughout the application
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 4.2 Update profile components
  - Update app/(tabs)/profile.tsx to show "Become a Service Provider" button
  - Update profile display logic to show "verified service provider" status
  - Update all text and labels to use service provider terminology
  - _Requirements: 1.1, 1.2_

- [x] 4.3 Update payment components
  - Update PaymentModal component to use serviceProviderId prop instead of sellerId
  - Update MalaysianPaymentModal component to use serviceProviderId prop
  - Update all payment-related UI text to use service provider terminology
  - _Requirements: 1.1, 1.2, 3.3_

- [x] 4.4 Update order and job components
  - Update OrderCard component to use isServiceProvider variable instead of isSeller
  - Update all order-related components to use service provider terminology in UI text
  - Update job proposal and completion components to use new terminology
  - _Requirements: 1.1, 1.2_

- [x] 5. Update routing and navigation
  - Update app/_layout.tsx to use become-service-provider route
  - Update all navigation references from /become-seller to /become-service-provider
  - Update settings.tsx to redirect to new become service provider route
  - _Requirements: 1.4_

- [ ] 6. Update database queries and API calls
- [ ] 6.1 Update all database queries in service classes
  - Replace all instances of seller_id with service_provider_id in database queries
  - Update all Supabase select, insert, update, and delete operations
  - Update all RPC function calls to use new parameter names
  - _Requirements: 2.1, 2.2_

- [ ] 6.2 Update database function calls
  - Update mark_work_completed RPC calls to use p_service_provider_id parameter
  - Update all other database function calls to use new parameter names
  - Update error handling for database operations
  - _Requirements: 2.1, 2.2_

- [ ] 7. Update test files and scripts
- [ ] 7.1 Update test scripts
  - Update all test scripts in scripts/ directory to use new terminology
  - Update test data creation to use service_provider fields
  - Update test assertions to check for service provider terminology
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7.2 Update migration and setup scripts
  - Update existing migration scripts to use new terminology
  - Update any setup or demo scripts to use service provider terminology
  - Ensure all scripts work with updated database schema
  - _Requirements: 6.1, 6.2_

- [ ] 8. Update documentation and markdown files
  - Update all documentation files to use service provider terminology
  - Update README files and implementation summaries
  - Update any code comments that reference seller terminology
  - _Requirements: 1.3_

- [ ] 9. Run comprehensive testing
- [ ] 9.1 Test database migration
  - Execute database migration on development environment
  - Verify all data is preserved and relationships are intact
  - Test rollback procedures to ensure they work correctly
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9.2 Test application functionality
  - Test complete user flow from becoming a service provider to completing jobs
  - Test payment flows with new terminology and database fields
  - Test all CRUD operations work correctly with new field names
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 9.3 Test UI consistency
  - Verify all UI text uses consistent service provider terminology
  - Test all forms submit correctly with new field names
  - Test navigation works with updated routes
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 10. Deploy and validate changes
  - Deploy changes to staging environment for final testing
  - Run end-to-end tests to ensure all functionality works correctly
  - Validate that no functionality is broken by the terminology changes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_