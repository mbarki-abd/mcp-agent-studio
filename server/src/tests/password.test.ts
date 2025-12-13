import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, verifyPassword, generateRandomPassword } from '../utils/password.js';
import bcrypt from 'bcryptjs';

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

describe('Password Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt with 14 salt rounds', async () => {
      // Arrange
      const password = 'mySecurePassword123!';
      const expectedHash = '$2a$14$hashedPassword';
      vi.mocked(bcrypt.hash).mockResolvedValue(expectedHash as never);

      // Act
      const result = await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 14);
      expect(result).toBe(expectedHash);
    });

    it('should handle empty password', async () => {
      // Arrange
      const password = '';
      const expectedHash = '$2a$14$emptyHash';
      vi.mocked(bcrypt.hash).mockResolvedValue(expectedHash as never);

      // Act
      const result = await hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 14);
      expect(result).toBe(expectedHash);
    });

    it('should throw error if bcrypt fails', async () => {
      // Arrange
      const password = 'testPassword';
      const error = new Error('Bcrypt failed');
      vi.mocked(bcrypt.hash).mockRejectedValue(error);

      // Act & Assert
      await expect(hashPassword(password)).rejects.toThrow('Bcrypt failed');
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      // Arrange
      const password = 'correctPassword';
      const hash = '$2a$12$hashedPassword';
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      // Act
      const result = await verifyPassword(password, hash);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      // Arrange
      const password = 'wrongPassword';
      const hash = '$2a$12$hashedPassword';
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      // Act
      const result = await verifyPassword(password, hash);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      // Arrange
      const password = '';
      const hash = '$2a$12$hashedPassword';
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      // Act
      const result = await verifyPassword(password, hash);

      // Assert
      expect(result).toBe(false);
    });

    it('should throw error if bcrypt compare fails', async () => {
      // Arrange
      const password = 'testPassword';
      const hash = 'invalidHash';
      const error = new Error('Invalid hash format');
      vi.mocked(bcrypt.compare).mockRejectedValue(error);

      // Act & Assert
      await expect(verifyPassword(password, hash)).rejects.toThrow('Invalid hash format');
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate password with default length of 16', () => {
      // Act
      const password = generateRandomPassword();

      // Assert
      expect(password).toHaveLength(16);
      expect(typeof password).toBe('string');
    });

    it('should generate password with custom length', () => {
      // Act
      const password = generateRandomPassword(24);

      // Assert
      expect(password).toHaveLength(24);
    });

    it('should generate password with minimum length', () => {
      // Act
      const password = generateRandomPassword(1);

      // Assert
      expect(password).toHaveLength(1);
    });

    it('should only contain allowed characters', () => {
      // Act
      const password = generateRandomPassword(100);
      const allowedChars = /^[A-Za-z0-9!@#$%^&*]+$/;

      // Assert
      expect(password).toMatch(allowedChars);
    });

    it('should generate different passwords each time', () => {
      // Act
      const password1 = generateRandomPassword(16);
      const password2 = generateRandomPassword(16);

      // Assert
      expect(password1).not.toBe(password2);
    });

    it('should handle very long passwords', () => {
      // Act
      const password = generateRandomPassword(1000);

      // Assert
      expect(password).toHaveLength(1000);
    });
  });
});
