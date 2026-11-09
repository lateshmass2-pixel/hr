// =============================================================================
// Work Intelligence — OAuth token encryption at rest
// =============================================================================
// GitHub access tokens are stored encrypted (AES-256-GCM). The key comes from
// ENCRYPTION_KEY (scrypt-stretched). There is deliberately NO default key:
// if ENCRYPTION_KEY is unset the OAuth callback refuses to store the token
// (the account can still be tracked via webhook-only mode), because a
// hard-coded fallback key would silently make "encrypted" a lie.
//
// Wire format (base64): [12-byte IV | ciphertext | 16-byte GCM auth tag]
// =============================================================================

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class EncryptionKeyMissingError extends Error {
    constructor() {
        super(
            'ENCRYPTION_KEY is not configured; refusing to store GitHub OAuth tokens. ' +
                'Set ENCRYPTION_KEY (32+ random chars) to enable token-backed sync.'
        );
        this.name = 'EncryptionKeyMissingError';
    }
}

function deriveKey(): Buffer | null {
    const raw = process.env.ENCRYPTION_KEY;
    if (!raw || raw.length < 16) return null;
    // Static salt is acceptable here: the key is per-deployment, high-entropy,
    // and never password-guessed in bulk (single-tenant-at-a-time threat model).
    return crypto.scryptSync(raw, 'hems-git-token-salt', 32);
}

/** Encrypt a GitHub access token. Throws EncryptionKeyMissingError if no key. */
export function encryptToken(token: string): string {
    const key = deriveKey();
    if (!key) throw new EncryptionKeyMissingError();

    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

/** Decrypt a token produced by encryptToken. Returns null when undecryptable. */
export function decryptToken(encrypted: string | null | undefined): string | null {
    if (!encrypted) return null;
    const key = deriveKey();
    if (!key) return null;

    try {
        const raw = Buffer.from(encrypted, 'base64');
        if (raw.length <= IV_BYTES + TAG_BYTES) return null;
        const iv = raw.subarray(0, IV_BYTES);
        const authTag = raw.subarray(raw.length - TAG_BYTES);
        const ciphertext = raw.subarray(IV_BYTES, raw.length - TAG_BYTES);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return plain.toString('utf8');
    } catch {
        return null;
    }
}

/** Webhook HMAC-SHA256 verification against the shared secret (§5, §22). */
export function verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
    secret: string | null | undefined
): boolean {
    if (!secret || !signatureHeader) return false;
    if (!signatureHeader.startsWith('sha256=')) return false;

    const expected =
        'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}
