import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserByClerkId, createUser } from '@/lib/db/queries';

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Try to get existing user from database
  let user = await getUserByClerkId(userId);

  if (!user) {
    // Create user if they don't exist
    const clerkUser = await currentUser();
    if (clerkUser) {
      try {
        user = await createUser({
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
          name: clerkUser.firstName
            ? `${clerkUser.firstName} ${clerkUser.lastName ?? ''}`.trim()
            : undefined,
          avatarUrl: clerkUser.imageUrl ?? undefined,
        });
      } catch (error) {
        // Handle race condition - user was created by another request
        user = await getUserByClerkId(userId);
      }
    }
  }

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthError();
  }

  return user;
}
