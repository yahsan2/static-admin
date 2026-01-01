import { scrypt } from '@noble/hashes/scrypt';
import { randomBytes } from '@noble/hashes/utils';

/**
 * Hash a password using scrypt (Edge-compatible)
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scrypt(password, salt, { N: 2 ** 14, r: 8, p: 1, dkLen: 64 });
  const saltHex = Buffer.from(salt).toString('hex');
  const hashHex = Buffer.from(hash).toString('hex');
  return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const inputHash = scrypt(password, salt, { N: 2 ** 14, r: 8, p: 1, dkLen: 64 });
  const storedHashBuffer = Buffer.from(hashHex, 'hex');

  // Constant-time comparison
  if (inputHash.length !== storedHashBuffer.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < inputHash.length; i++) {
    result |= inputHash[i]! ^ storedHashBuffer[i]!;
  }
  return result === 0;
}

/**
 * Generate a random session ID
 */
export function generateSessionId(): string {
  return Buffer.from(randomBytes(32)).toString('hex');
}

/**
 * Generate a random token (for password reset, etc.)
 */
export function generateToken(): string {
  return Buffer.from(randomBytes(32)).toString('hex');
}
