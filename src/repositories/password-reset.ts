import { createId } from "@paralleldrive/cuid2";

import { prisma } from "../prisma/client";

const TOKEN_EXPIRY_HOURS = 1;

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = createId();
  
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt
    }
  });

  return token;
}

export async function validatePasswordResetToken(
  token: string
): Promise<{ valid: false } | { valid: true; userId: number }> {
  const record = await prisma.passwordResetToken.findUnique({
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

export async function markTokenAsUsed(token: string): Promise<void> {
  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true }
  });
}

export async function invalidateUserTokens(userId: number): Promise<void> {
  await prisma.passwordResetToken.updateMany({
    where: { 
      userId,
      used: false
    },
    data: { used: true }
  });
}