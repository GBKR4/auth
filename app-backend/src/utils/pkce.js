import crypto from 'crypto';

/**
 * PKCE Utility (Server-side)
 * Implements the S256 code challenge verification for OAuth 2.0 PKCE.
 *
 * RFC 7636: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
 */

/**
 * Verify a PKCE code_verifier against a stored code_challenge (S256 method).
 * @param {string} codeVerifier  - Raw verifier sent by client at token exchange
 * @param {string} codeChallenge - BASE64URL(SHA256(verifier)) stored during authorize
 * @returns {boolean}
 */
export const verifyPKCE = (codeVerifier, codeChallenge) => {
  if (!codeVerifier || !codeChallenge) return false;
  try {
    // Compute SHA-256 of the verifier
    const hash = crypto.createHash('sha256').update(codeVerifier, 'ascii').digest();
    // Encode as base64url (no padding)
    const computed = hash
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return computed === codeChallenge;
  } catch {
    return false;
  }
};

/**
 * SHA-256 hash a raw token (for storing auth codes securely in DB).
 * @param {string} rawToken
 * @returns {string} hex digest
 */
export const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

export default { verifyPKCE, hashToken };
