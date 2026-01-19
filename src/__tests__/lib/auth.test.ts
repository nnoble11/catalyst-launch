import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentUser, requireAuth, AuthError } from '@/lib/auth';

// Mock Clerk
const mockAuth = vi.fn();
const mockCurrentUser = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
  currentUser: () => mockCurrentUser(),
}));

// Mock database queries
const mockGetUserByClerkId = vi.fn();
const mockCreateUser = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  getUserByClerkId: (...args: unknown[]) => mockGetUserByClerkId(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
}));

describe('Auth Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthError', () => {
    it('should have correct name property', () => {
      const error = new AuthError();
      expect(error.name).toBe('AuthError');
    });

    it('should have default message "Unauthorized"', () => {
      const error = new AuthError();
      expect(error.message).toBe('Unauthorized');
    });

    it('should accept custom message', () => {
      const error = new AuthError('Custom error message');
      expect(error.message).toBe('Custom error message');
    });

    it('should be instance of Error', () => {
      const error = new AuthError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const user = await getCurrentUser();

      expect(user).toBeNull();
      expect(mockGetUserByClerkId).not.toHaveBeenCalled();
    });

    it('should return existing user from database', async () => {
      const existingUser = {
        id: 'user_123',
        clerkId: 'clerk_123',
        email: 'test@example.com',
      };

      mockAuth.mockResolvedValue({ userId: 'clerk_123' });
      mockGetUserByClerkId.mockResolvedValue(existingUser);

      const user = await getCurrentUser();

      expect(user).toEqual(existingUser);
      expect(mockGetUserByClerkId).toHaveBeenCalledWith('clerk_123');
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('should create user when not in database', async () => {
      const clerkUser = {
        emailAddresses: [{ emailAddress: 'new@example.com' }],
        firstName: 'New',
        lastName: 'User',
        imageUrl: 'https://example.com/avatar.jpg',
      };
      const createdUser = {
        id: 'new_user_123',
        clerkId: 'clerk_123',
        email: 'new@example.com',
        name: 'New User',
      };

      mockAuth.mockResolvedValue({ userId: 'clerk_123' });
      mockGetUserByClerkId.mockResolvedValue(undefined);
      mockCurrentUser.mockResolvedValue(clerkUser);
      mockCreateUser.mockResolvedValue(createdUser);

      const user = await getCurrentUser();

      expect(user).toEqual(createdUser);
      expect(mockCreateUser).toHaveBeenCalledWith({
        clerkId: 'clerk_123',
        email: 'new@example.com',
        name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
    });

    it('should handle race condition during user creation', async () => {
      const existingUser = {
        id: 'user_123',
        clerkId: 'clerk_123',
        email: 'test@example.com',
      };

      mockAuth.mockResolvedValue({ userId: 'clerk_123' });
      mockGetUserByClerkId
        .mockResolvedValueOnce(undefined) // First call returns undefined
        .mockResolvedValueOnce(existingUser); // Second call after race condition
      mockCurrentUser.mockResolvedValue({
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      });
      mockCreateUser.mockRejectedValue(new Error('Duplicate key'));

      const user = await getCurrentUser();

      expect(user).toEqual(existingUser);
      expect(mockGetUserByClerkId).toHaveBeenCalledTimes(2);
    });

    it('should handle user with no first name', async () => {
      const clerkUser = {
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: null,
        lastName: null,
        imageUrl: null,
      };

      mockAuth.mockResolvedValue({ userId: 'clerk_123' });
      mockGetUserByClerkId.mockResolvedValue(undefined);
      mockCurrentUser.mockResolvedValue(clerkUser);
      mockCreateUser.mockResolvedValue({ id: 'new_user' });

      await getCurrentUser();

      expect(mockCreateUser).toHaveBeenCalledWith({
        clerkId: 'clerk_123',
        email: 'test@example.com',
        name: undefined,
        avatarUrl: undefined,
      });
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const user = { id: 'user_123', email: 'test@example.com' };

      mockAuth.mockResolvedValue({ userId: 'clerk_123' });
      mockGetUserByClerkId.mockResolvedValue(user);

      const result = await requireAuth();

      expect(result).toEqual(user);
    });

    it('should throw AuthError when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      await expect(requireAuth()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError when user not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' });
      mockGetUserByClerkId.mockResolvedValue(undefined);
      mockCurrentUser.mockResolvedValue(null);

      await expect(requireAuth()).rejects.toThrow(AuthError);
    });
  });
});
