export interface PaymentAutomationRequest {
  method: string;
  trxId: string;
  amountBdt: number;
  type: 'order' | 'topup';
  userId: string;
}

export interface PaymentAutomationResponse {
  autoVerified: boolean;
  status: 'completed' | 'pending';
  message: string;
}

/**
 * Clean Payment Gateway Hook (Ready for SMS / TrxID Automation)
 *
 * When VITE_PAYMENT_API_URL is configured, posts TrxID & amount to your
 * external verification endpoint. Otherwise falls back cleanly to Admin queue.
 */
export async function verifyPaymentAutomation({
  method,
  trxId,
  amountBdt,
  type,
  userId,
}: PaymentAutomationRequest): Promise<PaymentAutomationResponse> {
  const endpoint = import.meta.env.VITE_PAYMENT_API_URL;

  if (!endpoint) {
    return {
      autoVerified: false,
      status: 'pending',
      message: 'TrxID submitted for verification.',
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method,
        trxId: trxId.trim(),
        amountBdt: Number(amountBdt),
        type,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Gateway verification unavailable');
    }

    const data = await response.json();
    if (data?.verified === true) {
      return {
        autoVerified: true,
        status: 'completed',
        message: 'Payment verified automatically!',
      };
    }

    return {
      autoVerified: false,
      status: 'pending',
      message: data?.message || 'Submitted for verification.',
    };
  } catch (err) {
    console.warn('Automation hook fallback to manual approval:', err);
    return {
      autoVerified: false,
      status: 'pending',
      message: 'Submitted for verification.',
    };
  }
}
