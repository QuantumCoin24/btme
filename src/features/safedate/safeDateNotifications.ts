import * as Notifications from "expo-notifications";

const SAFE_DATE_NOTIFICATION_KIND =
  "btme-safe-date-check-in";

function isSafeDateReminder(
  notification: Notifications.NotificationRequest,
  datePlanId: string,
) {
  const data = notification.content.data;

  return (
    data?.kind === SAFE_DATE_NOTIFICATION_KIND &&
    data?.datePlanId === datePlanId
  );
}

export async function ensureSafeDateNotificationPermission() {
  const existing =
    await Notifications.getPermissionsAsync();

  if (existing.granted) {
    return true;
  }

  const requested =
    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

  return requested.granted;
}

export async function cancelSafeDateCheckInReminder(
  datePlanId: string,
) {
  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  const matching = scheduled.filter((notification) =>
    isSafeDateReminder(notification, datePlanId),
  );

  await Promise.all(
    matching.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(
        notification.identifier,
      ),
    ),
  );
}

export async function scheduleSafeDateCheckInReminder(
  datePlanId: string,
  minutes: number,
) {
  await cancelSafeDateCheckInReminder(datePlanId);

  const permitted =
    await ensureSafeDateNotificationPermission();

  if (!permitted) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "SafeDate™ check-in",
      body: "Open BTME™ and confirm you're OK.",
      sound: "default",
      data: {
        kind: SAFE_DATE_NOTIFICATION_KIND,
        datePlanId,
      },
    },
    trigger: {
      type:
        Notifications.SchedulableTriggerInputTypes
          .TIME_INTERVAL,
      seconds: minutes * 60,
      repeats: true,
    },
  });

  return true;
}
