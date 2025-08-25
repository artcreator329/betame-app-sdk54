import { NextRequest, NextResponse } from 'next/server';
import CurlecPaymentService from './curlec-payment-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-curlec-signature') || '';
    
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    console.log('Received Curlec webhook:', {
      event_type: payload.event_type,
      timestamp: new Date().toISOString(),
    });

    // Process the webhook
    const paymentService = CurlecPaymentService.getInstance();
    const success = await paymentService.processWebhook(payload, signature);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Curlec webhook endpoint is active' });
}
