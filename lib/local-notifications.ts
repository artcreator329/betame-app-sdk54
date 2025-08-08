import type { Notification as AppNotification } from '@/types/notification';

let notificationsModule: any | null = null;

async function ensureModule() {
  if (notificationsModule) return notificationsModule;
  try {
    // Dynamically import to avoid bundling issues if not installed
    const mod = await import('expo-notifications');
    notificationsModule = mod;
    return mod;
  } catch {
    return null;
  }
}

export async function configureLocalNotifications() {
  const mod = await ensureModule();
  if (!mod) return;

  await mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function showLocalNotification(notification: AppNotification) {
  const mod = await ensureModule();
  if (!mod) return;

  try {
    await mod.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.message,
        data: notification.data ?? {},
      },
      trigger: null,
    });
  } catch {
    // ignore
  }
}