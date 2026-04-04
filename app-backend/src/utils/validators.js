// Validation helper functions

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isStrongPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove dangerous characters and trim
  return input.trim().replace(/[<>]/g, '');
};

export const isValidUsername = (username) => {
  // 3-30 characters, alphanumeric, underscores, hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
};

export const isValidPhoneNumber = (phone) => {
  // Simple phone validation (customize based on your needs)
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

export const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Validates a client-supplied redirect/base URL against the server's
 * ALLOWED_ORIGINS + FRONTEND_URL allowlist to prevent open-redirect attacks.
 *
 * Returns the original url if its origin is on the allowlist, or undefined
 * so callers fall back to process.env.FRONTEND_URL.
 */
export const sanitizeClientUrl = (url) => {
  if (!url || typeof url !== 'string') return undefined;
  try {
    const { origin } = new URL(url);
    const allowed = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (process.env.FRONTEND_URL) allowed.push(process.env.FRONTEND_URL);
    return [...new Set(allowed)].includes(origin) ? url : undefined;
  } catch {
    return undefined;
  }
};
