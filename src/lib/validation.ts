/** Sanitize user input: trim, limit length and strip dangerous protocols.
 *  React escapes text automatically, so we do NOT HTML-encode here. Storing
 *  `&amp;` style entities in the database corrupts display names and listings. */
export function sanitizeText(input: string, maxLength = 5000): string {
  return String(input ?? '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, maxLength);
}

/** Validate Thai phone / PromptPay ID */
export function isValidPromptPayId(id: string): boolean {
  const digits = id.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 13;
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate file for upload */
export function validateImageFile(file: File, maxSizeMB = 5): { ok: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Only image files are allowed.' };
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: 'Supported formats: JPG, PNG, WebP.' };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { ok: false, error: `File too large. Maximum ${maxSizeMB}MB.` };
  }
  return { ok: true };
}

const ATTACHMENT_TYPE_LIMITS: Record<string, { maxSizeMB: number; allowed: string[] }> = {
  image: {
    maxSizeMB: 10,
    allowed: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'],
  },
  video: {
    maxSizeMB: 50,
    allowed: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
  audio: {
    maxSizeMB: 20,
    allowed: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'],
  },
  file: {
    maxSizeMB: 25,
    allowed: [
      'application/pdf',
      'application/zip',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
  },
};

export type AttachmentCategory = 'image' | 'video' | 'audio' | 'file';

export function getAttachmentCategory(mimeType: string): AttachmentCategory | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}

export function validateAttachmentFile(file: File): { ok: boolean; category?: AttachmentCategory; error?: string } {
  const category = getAttachmentCategory(file.type);
  if (!category) {
    return { ok: false, error: 'Unsupported file type.' };
  }
  const config = ATTACHMENT_TYPE_LIMITS[category];
  if (!config.allowed.includes(file.type)) {
    return { ok: false, category, error: `Unsupported ${category} format.` };
  }
  if (file.size > config.maxSizeMB * 1024 * 1024) {
    return { ok: false, category, error: `File too large. Maximum ${config.maxSizeMB}MB.` };
  }
  return { ok: true, category };
}

export function getAttachmentIcon(category: AttachmentCategory): string {
  switch (category) {
    case 'image': return 'image';
    case 'video': return 'video';
    case 'audio': return 'audio';
    case 'file': return 'file';
    default: return 'file';
  }
}

/** Validate price */
export function isValidPrice(price: number): boolean {
  return Number.isFinite(price) && price >= 10 && price <= 10_000_000;
}

/** Detect contact information shared in a message (LINE ID, phone, email, URL). */
export function detectContactInfo(text: string): boolean {
  const lineIdPattern = /(?:LINE[:\s]+|ไลน์\s+)([a-zA-Z0-9._-]+)|@([a-zA-Z0-9._-]+)/i;
  const thaiPhonePattern = /0\d{1,2}[-.]?\d{3}[-.]?\d{4}/;
  const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/;
  return lineIdPattern.test(text) || thaiPhonePattern.test(text) || emailPattern.test(text) || urlPattern.test(text);
}

/** Validate shipping address */
export function validateShippingAddress(addr: Record<string, string>): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!addr.name?.trim()) errors.name = 'Name is required';
  if (!addr.address?.trim()) errors.address = 'Address is required';
  if (!addr.phone?.trim()) errors.phone = 'Phone is required';
  if (addr.phone && !/^\d{9,15}$/.test(addr.phone.replace(/\D/g, ''))) {
    errors.phone = 'Please enter a valid phone number';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
