import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token with Clerk
    const session = await clerkClient.sessions.verifySession(token);

    if (!session || !session.userId) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    // Get user details from Clerk
    const clerkUser = await clerkClient.users.getUser(session.userId);

    if (!clerkUser) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();

    if (!email) {
      res.status(401).json({ error: 'User email not found' });
      return;
    }

    // Upsert user in database
    await prisma.user.upsert({
      where: { clerkId: session.userId },
      update: { email, name },
      create: {
        clerkId: session.userId,
        email,
        name,
        image: clerkUser.imageUrl || undefined,
      },
    });

    req.userId = session.userId;
    req.userEmail = email;
    req.userName = name;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const session = await clerkClient.sessions.verifySession(token);
        if (session && session.userId) {
          const clerkUser = await clerkClient.users.getUser(session.userId);
          const email = clerkUser?.emailAddresses[0]?.emailAddress;
          const name = clerkUser ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() : undefined;

          if (email) {
            await prisma.user.upsert({
              where: { clerkId: session.userId },
              update: { email, name },
              create: {
                clerkId: session.userId,
                email,
                name,
                image: clerkUser?.imageUrl,
              },
            });

            req.userId = session.userId;
            req.userEmail = email;
            req.userName = name;
          }
        }
      } catch (error) {
        console.error('Optional auth error:', error);
        // Continue without auth
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};
