import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";

let NotificationsModule: any = null;

// On Android inside Expo Go, expo-notifications throws at module load time
// because Expo removed native FCM push notifications in SDK 53+.
// Standalone development builds (EAS build) or production APKs have full native support.
const isExpoGoAndroid = isRunningInExpoGo() && Platform.OS === "android";

if (!isExpoGoAndroid) {
  try {
    NotificationsModule = require("expo-notifications");
  } catch {
    NotificationsModule = null;
  }
}

export const Notifications: any = NotificationsModule || {
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ status: "granted" }),
  requestPermissionsAsync: async () => ({ status: "granted" }),
  getExpoPushTokenAsync: async () => ({ data: null }),
  setNotificationChannelAsync: async () => {},
  scheduleNotificationAsync: async () => "mock-notif-id",
  cancelScheduledNotificationAsync: async () => {},
  cancelAllScheduledNotificationsAsync: async () => {},
  setBadgeCountAsync: async () => {},
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  getLastNotificationResponseAsync: async () => null,
  AndroidNotificationPriority: {
    MIN: 1,
    LOW: 2,
    DEFAULT: 3,
    HIGH: 4,
    MAX: 5,
  },
  AndroidImportance: {
    UNKNOWN: 0,
    UNSPECIFIED: 1,
    NONE: 2,
    MIN: 3,
    LOW: 4,
    DEFAULT: 5,
    HIGH: 6,
    MAX: 7,
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: "timeInterval",
    CALENDAR: "calendar",
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    YEARLY: "yearly",
  },
};
