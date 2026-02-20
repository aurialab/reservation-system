import prisma from "../prisma/client";

export type NotificationRecord = {
  id: number;
  userId: number;
  text: string;
  createdAt: Date;
};

export type CreateNotificationInput = {
  text: string;
  users?: number[];
};

export class InvalidNotificationUsersError extends Error {
  missingUserIds: number[];

  constructor(missingUserIds: number[]) {
    super("Invalid notification users");
    this.missingUserIds = missingUserIds;
  }
}

export async function listNotifications(): Promise<NotificationRecord[]> {
  return prisma.notification.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listNotificationsByUser(
  userId: number
): Promise<NotificationRecord[]> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
}

export async function createNotifications(
  input: CreateNotificationInput
): Promise<void> {
  const userIds = input.users?.length
    ? input.users
    : (await prisma.user.findMany({ select: { id: true } })).map(
        (user) => user.id
      );

  if (!userIds.length) {
    return;
  }

  if (input.users?.length) {
    const existing = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true }
    });
    const existingIds = new Set(existing.map((user) => user.id));
    const missing = userIds.filter((id) => !existingIds.has(id));

    if (missing.length) {
      throw new InvalidNotificationUsersError(missing);
    }
  }

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, text: input.text }))
  });
}

export async function savePushToken(
  userId: number,
  token: string
): Promise<void> {
  await prisma.pushToken.create({ data: { userId, token } });
}
