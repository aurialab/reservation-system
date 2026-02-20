import { createId } from "@paralleldrive/cuid2";

import { prisma } from "../prisma/client";

const TOKEN_EXPIRY_HOURS = 24;

export async function createEmailVerificationToken(userId: number): Promise<string> {
  const token = createId();
  
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt
    }
  });

  return token;
}

export async function validateEmailVerificationToken(
  token: string
): Promise<{ valid: false } | { valid: true; userId: number }> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token }
  });

  if (!record) {
    return { valid: false };
  }

  if (record.used) {
    return { valid: false };
  }

  if (new Date() > record.expiresAt) {
    return { valid: false };
  }

  return { valid: true, userId: record.userId };
}

export async function markEmailTokenAsUsed(token: string): Promise<void> {
  await prisma.emailVerificationToken.update({
    where: { token },
    data: { used: true }
  });
}

export async function verifyUserEmail(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true }
  });
}

export async function hasValidVerificationToken(userId: number): Promise<boolean> {
  const token = await prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      used: false,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  return !!token;
}

export async function invalidateUserEmailTokens(userId: number): Promise<void> {
  await prisma.emailVerificationToken.updateMany({
    where: {
      userId,
      used: false
    },
    data: { used: true }
  });
}
