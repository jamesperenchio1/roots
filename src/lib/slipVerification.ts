import jsQR from 'jsqr';
import { supabase } from './supabase';

export type SlipFailureType = 'mismatch' | 'service_down' | 'qr_not_found' | null;

export interface SlipVerificationResult {
  passed: boolean;
  status: 'passed' | 'uncertain' | 'failed';
  failureType: SlipFailureType;
  provider?: string;
  extractedText?: string;
  amountFound?: boolean;
  recipientFound?: boolean;
  reasons: string[];
  warnings?: string[];
  details?: {
    amount?: number;
    transRef?: string;
    transDate?: string;
    transTime?: string;
    senderName?: string;
    receiverName?: string;
    receiverProxy?: { type?: string; value?: string };
    sendingBank?: string;
    receivingBank?: string;
  };
}

/**
 * Extract the ThaiQR / PromptPay payload from a payment-slip image.
 * Scans the image for a QR code and decodes it to the EMVCo payload string.
 */
export async function extractQrPayload(imageDataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth',
      });
      resolve(code?.data || null);
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
}

/**
 * Verify a Thai bank payment slip by reading its QR code and querying
 * SlipOK via a Supabase Edge Function.
 *
 * Returns structured result with failureType so caller can decide:
 *   - 'mismatch'    → buyer uploaded wrong slip (block, ask to retry)
 *   - 'service_down'→ SlipOK/Edge Function unreachable (fallback to manual review)
 *   - 'qr_not_found'→ jsQR couldn't decode image (fallback to manual review)
 *   - null          → verification passed
 */
export async function verifyPaymentSlip(
  imageDataUrl: string,
  expectedAmount: number,
  sellerPromptPayId: string,
  _sellerName: string
): Promise<SlipVerificationResult> {
  // 1️⃣ Extract QR payload from the image
  const payload = await extractQrPayload(imageDataUrl);

  if (!payload) {
    return {
      passed: false,
      status: 'failed',
      failureType: 'qr_not_found',
      reasons: ['Could not find a QR code in the slip image. Please upload a clearer photo of the full slip.'],
    };
  }

  // 2️⃣ Call the Edge Function to verify against bank records
  try {
    const { data, error } = await supabase.functions.invoke('verify-slip', {
      body: {
        payload,
        expectedAmount,
        expectedRecipient: sellerPromptPayId,
      },
    });

    // Edge Function returned an error (SlipOK down, misconfigured, etc.)
    if (error) {
      console.error('Edge function error:', error);
      return {
        passed: false,
        status: 'failed',
        failureType: 'service_down',
        reasons: ['Slip verification service is temporarily unavailable. Your order will be sent to the seller for manual review.'],
      };
    }

    // SlipOK responded with an error code (1008 invalid QR, 1009 bank down, etc.)
    if (data?.error) {
      const isServiceError =
        data.error?.includes('API error') ||
        data.error?.includes('not configured') ||
        data.error?.includes('Internal error') ||
        data.error?.includes('All providers failed');

      if (isServiceError) {
        return {
          passed: false,
          status: 'failed',
          failureType: 'service_down',
          reasons: ['Slip verification service is temporarily unavailable. Your order will be sent to the seller for manual review.'],
        };
      }

      return {
        passed: false,
        status: 'failed',
        failureType: 'mismatch',
        reasons: [data.error],
      };
    }

    const verified: boolean = data?.verified ?? false;
    const errors: string[] = data?.errors ?? [];
    const warnings: string[] = data?.warnings ?? [];

    let status: SlipVerificationResult['status'];
    let failureType: SlipFailureType = null;

    if (verified) {
      status = 'passed';
    } else if (errors.length > 0) {
      status = 'failed';
      failureType = 'mismatch';
    } else {
      status = 'uncertain';
      failureType = 'service_down'; // Treat uncertain as manual review fallback
    }

    return {
      passed: verified,
      status,
      failureType,
      provider: data?.provider,
      amountFound: data?.details?.amount !== undefined,
      recipientFound: data?.details?.receiverProxy?.value !== undefined,
      reasons: errors.length > 0 ? errors : warnings,
      warnings,
      details: data?.details,
    };
  } catch (err) {
    console.error('verifyPaymentSlip error:', err);
    return {
      passed: false,
      status: 'failed',
      failureType: 'service_down',
      reasons: [
        'Could not reach the verification service. Your order will be sent to the seller for manual review.',
      ],
    };
  }
}
