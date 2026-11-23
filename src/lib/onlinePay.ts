import { supabase } from '@/lib/supabase';

declare global { interface Window { Razorpay?: any } }

export function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export type PayOutcome = { status: 'paid' | 'pending' | 'dismissed' | 'failed'; message?: string };

/**
 * Starts an online payment. `body` is either { items: [{student_fee_id, amount}] } (fees) or { store_order_id }. The server prices
 * and validates the order; the browser only opens the gateway window and forwards the signed result for verification.
 */
export async function payOnline(body: Record<string, unknown>, description: string): Promise<PayOutcome> {
  const { data, error } = await supabase.functions.invoke('payments-create-order', { body });
  if (error || !data?.success) throw new Error(data?.error || (error as any)?.message || 'Could not start the payment.');
  if (!(await loadCheckout())) throw new Error('The payment window could not be loaded. Check your connection.');
  return new Promise<PayOutcome>((resolve) => {
    const rz = new window.Razorpay({
      key: data.key_id, order_id: data.gateway_order_id, amount: data.amount_paise, currency: 'INR', name: 'College payment', description,
      handler: async (r: any) => {
        const v = await supabase.functions.invoke('payments-verify', { body: { razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature } });
        resolve(v.data?.success ? { status: 'paid' } : { status: 'pending', message: v.data?.message || 'If money was debited it will be applied automatically within a few minutes.' });
      },
      modal: { ondismiss: () => resolve({ status: 'dismissed' }) },
    });
    rz.on('payment.failed', (r: any) => resolve({ status: 'failed', message: r?.error?.description || 'Nothing was charged.' }));
    rz.open();
  });
}
