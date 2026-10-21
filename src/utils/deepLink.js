/**
 * Validates and sanitizes a deep-link URL to ensure navigation stays strictly within
 * the trusted RecruTrain application. Rejects protocol-relative, javascript:, and cross-origin targets.
 *
 * @param {string} rawUrl - The deep link URL candidate
 * @returns {string|null} - Sanitized internal relative path or null if invalid/untrusted
 */
export function validateDeepLink(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  // Reject javascript:, data:, vbscript: schemes
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return null;
  }

  // Safe relative paths starting with single '/' and not protocol-relative '//'
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // Absolute URL validation
  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

    if (parsed.origin === currentOrigin) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    return null;
  }

  return null;
}
