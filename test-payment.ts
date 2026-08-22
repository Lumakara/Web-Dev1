/**
 * Payment Integration Test Suite
 * Run locally to test payment service endpoints
 */

import { supabase } from '@/lib/supabase';

// Mock order data for testing
const TEST_ORDER_ID = 'TEST-ORDER-' + Date.now();
const TEST_AMOUNT = 169900; // WiFi Basic price

console.log('=== PAYMENT INTEGRATION TEST ===');
console.log('Test Order ID:', TEST_ORDER_ID);
console.log('Test Amount: Rp', TEST_AMOUNT.toLocaleString('id-ID'));

// Test 1: Create payment
async function testCreatePayment() {
  console.log('\n📋 TEST 1: Create Payment (Mustika Primary)');
  
  try {
    const { data, error } = await supabase.functions.invoke('payment', {
      body: {
        action: 'create',
        orderId: TEST_ORDER_ID,
        amount: TEST_AMOUNT,
        method: 'qris'
      }
    });

    if (error) {
      console.error('❌ Error:', error.message);
      
      if (error.message.includes('edge-function not found')) {
        console.log('⚠️ Edge Function must be deployed first!');
        console.log('   Deploy via: npx supabase functions deploy payment');
      } else if (error.message.includes('MUSTIKA_API_KEY')) {
        console.log('⚠️ MUSTIKA_API_KEY not configured in Supabase Edge Functions secrets');
        console.log('   Go to: https://supabase.com/dashboard/project/_/functions/payment/secrets');
        console.log('   Add secret: MUSTIKA_API_KEY=your_actual_key_here');
      }
      return null;
    }

    if (!data.success) {
      console.error('❌ Failed:', data.error);
      return null;
    }

    console.log('✅ Payment created successfully!');
    console.log('   Provider:', data.payment.provider);
    console.log('   Status:', data.payment.status);
    console.log('   Transaction ID:', data.payment.provider_transaction_id);
    console.log('   Amount:', data.payment.amount);
    
    if (data.payment.qr_string) {
      console.log('   QR Code available ✓');
    }
    
    if (data.fallback) {
      console.log('   ⚠️ Used Rama fallback due to Mustika unavailable');
    }

    return data.payment;

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    return null;
  }
}

// Test 2: Check payment status
async function testCheckStatus(paymentId: string | null) {
  if (!paymentId) {
    console.log('\n⏭ SKIP TEST 2: No payment to check status');
    return;
  }

  console.log('\n📋 TEST 2: Check Payment Status');
  
  try {
    const { data, error } = await supabase.functions.invoke('payment', {
      body: {
        action: 'status',
        orderId: TEST_ORDER_ID
      }
    });

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    console.log('✅ Status check successful!');
    console.log('   Current status:', data.status);
    console.log('   Paid at:', data.paidAt || 'Not yet paid');
    console.log('   Expires at:', data.expiresAt);

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
}

// Test 3: Idempotency test (duplicate request)
async function testIdempotency(existingPayment: any) {
  if (!existingPayment) {
    console.log('\n⏭ SKIP TEST 3: No existing payment for idempotency test');
    return;
  }

  console.log('\n📋 TEST 3: Idempotency (Duplicate Request Prevention)');
  
  try {
    const { data, error } = await supabase.functions.invoke('payment', {
      body: {
        action: 'create',
        orderId: TEST_ORDER_ID,
        amount: TEST_AMOUNT,
        method: 'qris'
      }
    });

    if (error && !error.message.includes('edge-function not found')) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (data.idempotent) {
      console.log('✅ Idempotency verified!');
      console.log('   Returned same payment (no duplicate creation)');
      console.log('   Payment ID matches:', data.payment.id === existingPayment.id);
    } else {
      console.warn('⚠️ Warning: Duplicate payment may have been created!');
    }

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
}

// Run all tests
(async () => {
  const payment = await testCreatePayment();
  await testCheckStatus(payment?.id || null);
  await testIdempotency(payment);
  
  console.log('\n=== TEST COMPLETE ===');
  console.log('Note: Real payment testing requires valid credentials.');
  console.log('See logs above for specific configuration errors.');
})();
