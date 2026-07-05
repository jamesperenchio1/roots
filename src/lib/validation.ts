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

/** Validate price */
export function isValidPrice(price: number): boolean {
  return Number.isFinite(price) && price >= 10 && price <= 10_000_000;
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
