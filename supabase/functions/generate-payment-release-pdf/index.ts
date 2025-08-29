import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { orderId, tableSource } = await req.json()

    if (!orderId || !tableSource) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: orderId, tableSource' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📄 Generating PDF for ${tableSource} with ID: ${orderId}`)

    // Get order data based on table source
    let orderData: any
    let jobData: any

    switch (tableSource) {
      case 'orders':
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (orderError || !order) {
          return new Response(
            JSON.stringify({ error: 'Order not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        orderData = order
        jobData = {
          id: order.id,
          title: order.service_title,
          service_title: order.service_title,
          service_provider_id: order.service_provider_id || order.seller_id,
          seller_id: order.seller_id,
          buyer_id: order.buyer_id,
          customer_id: order.buyer_id,
          price: order.amount,
          amount: order.amount,
          platform_fee: order.platform_fee || 0,
          final_payout: order.amount - (order.platform_fee || 0),
          payment_released_at: order.payment_released_at,
          status: order.status,
          table_source: 'orders'
        }
        break

      case 'active_jobs':
        const { data: activeJob, error: activeJobError } = await supabase
          .from('active_jobs')
          .select('*')
          .eq('id', orderId)
          .single()

        if (activeJobError || !activeJob) {
          return new Response(
            JSON.stringify({ error: 'Active job not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        orderData = activeJob
        jobData = activeJob
        break

      case 'escrow_transactions':
        const { data: escrow, error: escrowError } = await supabase
          .from('escrow_transactions')
          .select('*')
          .eq('id', orderId)
          .single()

        if (escrowError || !escrow) {
          return new Response(
            JSON.stringify({ error: 'Escrow transaction not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        orderData = escrow
        jobData = escrow
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid table source' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    // Generate PDF content
    const releaseDate = new Date().toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const jobTitle = jobData.title || jobData.service_title || 'Service'
    const originalAmount = jobData.price || jobData.amount || jobData.payment_amount || 0
    const platformFee = jobData.platform_fee || 0
    const finalPayout = originalAmount - platformFee
    const receiptNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Generate HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Release Receipt</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
          }
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .content {
            padding: 40px;
          }
          .receipt-number {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
            border-left: 4px solid #667eea;
          }
          .receipt-number h3 {
            margin: 0;
            color: #667eea;
            font-size: 18px;
          }
          .receipt-number p {
            margin: 5px 0 0 0;
            font-family: monospace;
            font-size: 16px;
            font-weight: 600;
          }
          .job-details {
            margin-bottom: 30px;
          }
          .job-details h3 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .detail-label {
            font-weight: 600;
            color: #555;
          }
          .detail-value {
            color: #333;
          }
          .payment-breakdown {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
          }
          .payment-breakdown h3 {
            color: #667eea;
            margin-bottom: 15px;
            text-align: center;
          }
          .breakdown-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
          }
          .breakdown-row.total {
            border-top: 2px solid #667eea;
            padding-top: 15px;
            margin-top: 15px;
            font-weight: 600;
            font-size: 18px;
            color: #667eea;
          }
          .admin-info {
            background: #e8f4fd;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
            border-left: 4px solid #007AFF;
          }
          .admin-info h3 {
            color: #007AFF;
            margin-bottom: 15px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="logo">BetaMe</div>
            <h1>Payment Release Receipt</h1>
            <p>Official payment release confirmation</p>
          </div>
          
          <div class="content">
            <div class="receipt-number">
              <h3>Receipt Number</h3>
              <p>${receiptNumber}</p>
            </div>
            
            <div class="job-details">
              <h3>Job Details</h3>
              <div class="detail-row">
                <span class="detail-label">Job Title:</span>
                <span class="detail-value">${jobTitle}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Job ID:</span>
                <span class="detail-value">${jobData.id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Service Provider:</span>
                <span class="detail-value">${jobData.service_provider_name || jobData.seller_name || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Buyer:</span>
                <span class="detail-value">${jobData.buyer_name || jobData.customer_name || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Release Date:</span>
                <span class="detail-value">${releaseDate}</span>
              </div>
            </div>
            
            <div class="payment-breakdown">
              <h3>Payment Breakdown</h3>
              <div class="breakdown-row">
                <span>Original Amount:</span>
                <span>RM ${originalAmount.toFixed(2)}</span>
              </div>
              <div class="breakdown-row">
                <span>Platform Fee:</span>
                <span>- RM ${platformFee.toFixed(2)}</span>
              </div>
              <div class="breakdown-row total">
                <span>Final Payout:</span>
                <span>RM ${finalPayout.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="admin-info">
              <h3>Released By</h3>
              <div class="detail-row">
                <span class="detail-label">Admin Name:</span>
                <span class="detail-value">BetaMe System</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Admin Email:</span>
                <span class="detail-value">system@betame.com.my</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Release Time:</span>
                <span class="detail-value">${new Date().toLocaleString('en-MY')}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an official payment release receipt from BetaMe Platform</p>
            <p>Generated on ${new Date().toLocaleString('en-MY')}</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Generate text receipt
    const textReceipt = `
================================================================================
                              BETAME PLATFORM
                        PAYMENT RELEASE RECEIPT
================================================================================

Receipt Number: ${receiptNumber}
Release Date: ${releaseDate}

JOB DETAILS:
- Job Title: ${jobTitle}
- Job ID: ${jobData.id}
- Service Provider: ${jobData.service_provider_name || jobData.seller_name || 'N/A'}
- Buyer: ${jobData.buyer_name || jobData.customer_name || 'N/A'}

PAYMENT BREAKDOWN:
- Original Amount: RM ${originalAmount.toFixed(2)}
- Platform Fee: RM ${platformFee.toFixed(2)}
- Final Payout: RM ${finalPayout.toFixed(2)}

RELEASED BY:
- Admin Name: BetaMe System
- Admin Email: system@betame.com.my
- Release Time: ${new Date().toLocaleString('en-MY')}

================================================================================
This is an official payment release receipt from BetaMe Platform.
Generated on ${new Date().toLocaleString('en-MY')}
================================================================================
    `.trim()

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedTitle = jobTitle.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-')
    const fileName = `payment-release-${sanitizedTitle}-${timestamp}.txt`
    const filePath = `payment-release-pdfs/${jobData.id}/${fileName}`

    // Convert text to buffer
    const textBuffer = new TextEncoder().encode(textReceipt)

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, textBuffer, {
        contentType: 'text/plain',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Receipt upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: `Failed to upload payment release receipt: ${uploadError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // Store receipt record in database
    const { error: dbError } = await supabase
      .from('payment_release_pdfs')
      .insert({
        job_id: jobData.id,
        job_table_source: tableSource,
        admin_user_id: '00000000-0000-0000-0000-000000000000', // System admin
        pdf_file_url: publicUrl,
        pdf_filename: fileName,
        receipt_number: receiptNumber,
        job_title: jobTitle,
        service_provider_name: jobData.service_provider_name || jobData.seller_name || 'Unknown',
        buyer_name: jobData.buyer_name || jobData.customer_name || 'Unknown',
        original_amount: originalAmount,
        final_payout: finalPayout,
        currency: 'RM',
        generated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('❌ Database insert error:', dbError)
      return new Response(
        JSON.stringify({ error: `Failed to store PDF record: ${dbError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Payment release PDF generated successfully for:', jobData.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: publicUrl,
        receiptNumber: receiptNumber
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in generate-payment-release-pdf:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
