import crypto from "crypto";

/**
 * Hashes a plaintext password using Node.js native scrypt.
 * Returns a salt-prefixed hex string: `<salt>:<hash>`
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored `<salt>:<hash>`.
 * Uses timingSafeEqual to protect against timing attacks.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 2) return false;
    const [salt, expectedKeyHex] = parts;
    const computedHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(expectedKeyHex, "hex"),
      Buffer.from(computedHash, "hex"),
    );
  } catch {
    return false;
  }
}
