import {
  createNotifications,
  type CreateNotificationInput,
  listNotifications,
  listNotificationsByUser,
  type NotificationRecord,
  savePushToken
} from "../repositories/notifications";

export type Notification = {
  created: string;
  text: string;
};

function toNotification(record: NotificationRecord): Notification {
  return {
    created: record.createdAt.toISOString(),
    text: record.text
  };
}

export async function getLatestNotification(): Promise<Notification | null> {
  const notifications = await listNotifications();
  const latest = notifications[0];
  return latest ? toNotification(latest) : null;
}

export async function listUserNotifications(
  userId: number
): Promise<Notification[]> {
  const notifications = await listNotificationsByUser(userId);
  return notifications.map(toNotification);
}

export async function sendNotifications(
  input: CreateNotificationInput
): Promise<void> {
  await createNotifications(input);
}

export async function saveUserNotificationToken(
  userId: number,
  token: string
): Promise<void> {
  await savePushToken(userId, token);
}
