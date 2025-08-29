const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Mock OnDemandPDFService for testing
class OnDemandPDFService {
    static async getOrGeneratePDFReceipt(orderId, orderData) {
        try {
            console.log('📄 Getting or generating PDF receipt for order:', orderId);

            // Step 1: Try to get existing PDF receipt
            const { data: existingPdf, error } = await supabaseAdmin
                .from('payment_release_pdfs')
                .select('pdf_file_url')
                .eq('job_id', orderId)
                .order('generated_at', { ascending: false })
                .limit(1)
                .single();

            if (existingPdf && existingPdf.pdf_file_url) {
                console.log('✅ Found existing PDF receipt');

                // Verify the PDF is accessible
                try {
                    const response = await fetch(existingPdf.pdf_file_url, { method: 'HEAD' });
                    if (response.ok) {
                        return {
                            success: true,
                            pdfUrl: existingPdf.pdf_file_url,
                            generated: false
                        };
                    }
                } catch (fetchError) {
                    console.log('⚠️ Existing PDF not accessible, will regenerate');
                }
            }

            // Step 2: Generate new PDF receipt
            console.log('🔄 No accessible PDF found, generating new receipt...');

            // Validate order is eligible for PDF receipt
            if (orderData.status !== 'completed' || !orderData.payment_released_at) {
                return {
                    success: false,
                    error: 'PDF receipt is only available for completed orders with released payments'
                };
            }

            // Simulate PDF generation (in real app, this would call PaymentReleasePDFService)
            const receiptNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const fileName = `PaymentRelease_${orderData.service_title.replace(/[^a-zA-Z0-9]/g, '_')}_${receiptNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
            const filePath = `payment-release-pdfs/${orderId}/${fileName}`;

            // Simulate storage URL
            const simulatedPdfUrl = `https://rkcfgebgpixgfvggbwmc.supabase.co/storage/v1/object/public/documents/${filePath}`;

            // Store PDF record in database
            const { error: dbError } = await supabaseAdmin
                .from('payment_release_pdfs')
                .insert({
                    job_id: orderId,
                    job_table_source: 'orders',
                    admin_user_id: '00000000-0000-0000-0000-000000000000',
                    pdf_file_url: simulatedPdfUrl,
                    pdf_filename: fileName,
                    receipt_number: receiptNumber,
                    job_title: orderData.service_title,
                    service_provider_name: orderData.service_provider_name || 'Service Provider',
                    buyer_name: orderData.buyer_name || 'Customer',
                    original_amount: orderData.amount,
                    final_payout: orderData.amount - (orderData.platform_fee || 0),
                    currency: 'RM',
                    generated_at: new Date().toISOString()
                });

            if (dbError) {
                console.error('❌ Database insert error:', dbError);
                return {
                    success: false,
                    error: `Failed to store PDF record: ${dbError.message}`
                };
            }

            console.log('✅ PDF receipt generated and stored successfully');
            return {
                success: true,
                pdfUrl: simulatedPdfUrl,
                generated: true
            };

        } catch (error) {
            console.error('❌ Error in getOrGeneratePDFReceipt:', error);
            return {
                success: false,
                error: error.message || 'Failed to get or generate PDF receipt'
            };
        }
    }

    static async fetchOrderData(orderId) {
        try {
            console.log('🔍 Fetching order data for ID:', orderId);

            // Try to get from orders table first
            const { data: orderData, error: orderError } = await supabaseAdmin
                .from('orders')
                .select(`
          id,
          service_title,
          amount,
          platform_fee,
          payment_released_at,
          status,
          service_provider_id,
          buyer_id
        `)
                .eq('id', orderId)
                .single();

            if (orderData) {
                console.log('✅ Found order data in orders table');
                return {
                    id: orderData.id,
                    service_title: orderData.service_title,
                    amount: orderData.amount,
                    platform_fee: orderData.platform_fee,
                    payment_released_at: orderData.payment_released_at,
                    status: orderData.status,
                    service_provider_id: orderData.service_provider_id,
                    buyer_id: orderData.buyer_id,
                    service_provider_name: 'Test Service Provider',
                    buyer_name: 'Test Customer'
                };
            }

            console.log('❌ Order not found');
            return null;

        } catch (error) {
            console.error('❌ Error fetching order data:', error);
            return null;
        }
    }
}

async function testOnDemandPDFGeneration() {
    console.log('🧪 Testing On-Demand PDF Generation System');
    console.log('='.repeat(50));

    try {
        // Step 1: Find a completed order
        console.log('1️⃣ Finding completed orders...');
        const { data: completedOrders, error: ordersError } = await supabaseAdmin
            .from('orders')
            .select('id, service_title, status, payment_released_at, amount')
            .eq('status', 'completed')
            .not('payment_released_at', 'is', null)
            .limit(3);

        if (ordersError) {
            console.error('❌ Error fetching orders:', ordersError);
            return;
        }

        if (!completedOrders || completedOrders.length === 0) {
            console.log('⚠️ No completed orders found, creating test scenario...');

            // Test with a mock order
            const mockOrder = {
                id: 'test-order-' + Date.now(),
                service_title: 'Test Service',
                amount: 100,
                platform_fee: 10,
                payment_released_at: new Date().toISOString(),
                status: 'completed',
                service_provider_id: 'test-provider',
                buyer_id: 'test-buyer',
                service_provider_name: 'Test Provider',
                buyer_name: 'Test Customer'
            };

            console.log('📋 Testing with mock order:', mockOrder.id);

            const result = await OnDemandPDFService.getOrGeneratePDFReceipt(mockOrder.id, mockOrder);

            if (result.success) {
                console.log('✅ Mock PDF generation successful!');
                console.log('   Generated:', result.generated);
                console.log('   PDF URL:', result.pdfUrl);
            } else {
                console.log('❌ Mock PDF generation failed:', result.error);
            }

            return;
        }

        console.log(`✅ Found ${completedOrders.length} completed orders`);

        // Step 2: Test on-demand PDF generation for each order
        for (const order of completedOrders) {
            console.log(`\n2️⃣ Testing PDF generation for order: ${order.id}`);
            console.log(`   Service: ${order.service_title}`);
            console.log(`   Amount: RM ${order.amount}`);

            // Fetch full order data
            const orderData = await OnDemandPDFService.fetchOrderData(order.id);
            if (!orderData) {
                console.log('❌ Could not fetch order data');
                continue;
            }

            // Test first call (should generate PDF)
            console.log('   📄 First call - should generate PDF...');
            const firstResult = await OnDemandPDFService.getOrGeneratePDFReceipt(order.id, orderData);

            if (firstResult.success) {
                console.log('   ✅ First call successful!');
                console.log('      Generated:', firstResult.generated);
                console.log('      PDF URL:', firstResult.pdfUrl);
            } else {
                console.log('   ❌ First call failed:', firstResult.error);
                continue;
            }

            // Test second call (should return existing PDF)
            console.log('   📄 Second call - should return existing PDF...');
            const secondResult = await OnDemandPDFService.getOrGeneratePDFReceipt(order.id, orderData);

            if (secondResult.success) {
                console.log('   ✅ Second call successful!');
                console.log('      Generated:', secondResult.generated);
                console.log('      Same URL:', firstResult.pdfUrl === secondResult.pdfUrl);
            } else {
                console.log('   ❌ Second call failed:', secondResult.error);
            }
        }

        // Step 3: Test with ineligible order
        console.log('\n3️⃣ Testing with ineligible order...');
        const ineligibleOrder = {
            id: 'ineligible-order',
            service_title: 'Incomplete Service',
            amount: 50,
            status: 'work_in_progress', // Not completed
            payment_released_at: null,
            service_provider_name: 'Provider',
            buyer_name: 'Customer'
        };

        const ineligibleResult = await OnDemandPDFService.getOrGeneratePDFReceipt(
            ineligibleOrder.id,
            ineligibleOrder
        );

        if (!ineligibleResult.success) {
            console.log('✅ Correctly rejected ineligible order');
            console.log('   Error:', ineligibleResult.error);
        } else {
            console.log('❌ Should have rejected ineligible order');
        }

        console.log('\n🎉 On-Demand PDF Generation Test Complete!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testOnDemandPDFGeneration();