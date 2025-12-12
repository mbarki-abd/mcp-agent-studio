/**
 * Crypto Utility Tests
 *
 * Unit tests for encryption, decryption, and token generation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt, generateToken, hashToken } from '../utils/crypto.js';

// Mock environment variable
const MOCK_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-123';

describe('Crypto Utilities', () => {
  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', MOCK_ENCRYPTION_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a simple string', () => {
      const original = 'Hello, World!';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
    });

    it('should encrypt and decrypt special characters', () => {
      const original = 'Test with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?`~';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should encrypt and decrypt unicode characters', () => {
      const original = 'Unicode test: \u{1F600} \u{1F4BB} \u{1F680}';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should encrypt and decrypt empty string', () => {
      const original = '';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should encrypt and decrypt long strings', () => {
      const original = 'A'.repeat(10000);
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const original = 'Same text';
      const encrypted1 = encrypt(original);
      const encrypted2 = encrypt(original);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(original);
      expect(decrypt(encrypted2)).toBe(original);
    });

    it('should throw error for invalid encrypted data format', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('only:two')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('too:many:parts:here')).toThrow();
    });

    it('should throw error for tampered ciphertext', () => {
      const original = 'Test data';
      const encrypted = encrypt(original);
      const parts = encrypted.split(':');
      // Tamper with encrypted data
      parts[2] = 'ff'.repeat(parts[2].length / 2);
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });

    it('encrypted format should have three colon-separated parts', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');

      expect(parts.length).toBe(3);
      // IV should be 32 hex characters (16 bytes)
      expect(parts[0].length).toBe(32);
      // Auth tag should be 32 hex characters (16 bytes)
      expect(parts[1].length).toBe(32);
      // Encrypted data should be hex
      expect(/^[0-9a-f]+$/i.test(parts[2])).toBe(true);
    });
  });

  describe('generateToken', () => {
    it('should generate token with default length (32 bytes = 64 hex chars)', () => {
      const token = generateToken();

      expect(token.length).toBe(64);
      expect(/^[0-9a-f]+$/i.test(token)).toBe(true);
    });

    it('should generate token with custom length', () => {
      const token16 = generateToken(16);
      const token64 = generateToken(64);

      expect(token16.length).toBe(32); // 16 bytes = 32 hex chars
      expect(token64.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }

      expect(tokens.size).toBe(100);
    });
  });

  describe('hashToken', () => {
    it('should hash token consistently', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character hex string (SHA-256)', () => {
      const hash = hashToken('test');

      expect(hash.length).toBe(64);
      expect(/^[0-9a-f]+$/i.test(hash)).toBe(true);
    });

    it('should handle empty string', () => {
      const hash = hashToken('');

      expect(hash.length).toBe(64);
    });
  });

  describe('missing encryption key', () => {
    it('should throw error when ENCRYPTION_KEY is not set', () => {
      vi.stubEnv('ENCRYPTION_KEY', '');

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required');
    });
  });
});
