// Generates a valid Thai PromptPay QR payload (EMVCo standard) entirely
// client-side. Any Thai banking app can scan it to pay the seller the exact
// amount. No payment gateway or business registration required — free tier.
import QRCode from 'qrcode';

function tag(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTarget(id: string): { sub: string; value: string } {
  const digits = id.replace(/[^0-9]/g, '');
  // 13-digit numbers are treated as a National ID / Tax ID (sub-tag 02),
  // otherwise it's a mobile number (sub-tag 01) formatted as 0066XXXXXXXXX.
  if (digits.length === 13) {
    return { sub: '02', value: digits };
  }
  const phone = ('0000000000000' + digits.replace(/^0/, '66')).slice(-13);
  return { sub: '01', value: phone };
}

/** Build the raw PromptPay EMVCo payload string. */
export function buildPromptPayPayload(promptpayId: string, amount?: number): string {
  const { sub, value } = formatTarget(promptpayId);
  const merchant = tag('29', tag('00', 'A000000677010111') + tag(sub, value));

  let payload =
    tag('00', '01') +
    tag('01', amount && amount > 0 ? '12' : '11') +
    merchant +
    tag('53', '764') +
    (amount && amount > 0 ? tag('54', amount.toFixed(2)) : '') +
    tag('58', 'TH');

  payload += '6304';
  return payload + crc16(payload);
}

/** Render a PromptPay QR to a data URL (PNG) for an <img src>. */
export async function generatePromptPayQR(
  promptpayId: string,
  amount?: number
): Promise<string> {
  const payload = buildPromptPayPayload(promptpayId, amount);
  return QRCode.toDataURL(payload, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
}

/** Render an arbitrary string (e.g. a provenance URL) to a QR data URL. */
export async function generateQR(text: string, size = 320): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
}
