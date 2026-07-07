import { Html5Qrcode } from 'html5-qrcode';
import { verifyQRSignature } from './api';
import { logger } from './logger';

export interface QrVerifyResult {
  ok: boolean;
  plantId?: string;
  signature?: string;
  error?: string;
}

function parseQrUrl(text: string): { plantId: string; signature: string } | null {
  try {
    const url = new URL(text, window.location.origin);
    const hash = url.hash || '';
    // HashRouter paths look like #/p/<plantId>?s=<signature>
    const match = hash.match(/\/p\/([^?]+)(?:\?s=([^&]+))?/);
    if (!match) return null;
    const plantId = decodeURIComponent(match[1]);
    const signature = match[2] ? decodeURIComponent(match[2]) : '';
    if (!signature) return null;
    return { plantId, signature };
  } catch {
    return null;
  }
}

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const id = 'qr-verify-hidden-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  el.style.top = '-9999px';
  document.body.appendChild(el);
  try {
    const scanner = new Html5Qrcode(id);
    const result = await scanner.scanFile(file, true);
    await scanner.clear();
    return result || null;
  } catch (e) {
    logger.warn('decodeQrFromFile failed', { error: e instanceof Error ? e.message : String(e) });
    return null;
  } finally {
    el.remove();
  }
}

export async function verifyQrFromFile(file: File, expectedPlantId?: string): Promise<QrVerifyResult> {
  const text = await decodeQrFromFile(file);
  if (!text) return { ok: false, error: 'Could not read a QR code from this image. Make sure the QR is clear and well-lit.' };

  const parsed = parseQrUrl(text);
  if (!parsed) return { ok: false, error: 'QR code is not a valid Roots provenance tag.' };

  if (expectedPlantId && parsed.plantId !== expectedPlantId) {
    return { ok: false, plantId: parsed.plantId, signature: parsed.signature, error: 'QR code does not match this listing.' };
  }

  try {
    const valid = await verifyQRSignature(parsed.plantId, parsed.signature);
    if (!valid) return { ok: false, plantId: parsed.plantId, signature: parsed.signature, error: 'QR signature does not verify.' };
    return { ok: true, plantId: parsed.plantId, signature: parsed.signature };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Verification failed.' };
  }
}
