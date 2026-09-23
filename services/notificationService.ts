import * as Device from "expo-device";
import { Notifications } from "./notificationsWrapper";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import { apiRequest } from "./api";

// Configure notification behavior for incoming alerts
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority?.MAX ?? 2,
    }),
  });
} catch {
  // Ignored in environments where notification handler is restricted
}

export interface NotificationDto {
  id: number | string;
  title: string;
  body: string;
  is_read: boolean;
  type?: string;
  created_at: string;
  action_route?: string;
}

export const notificationService = {
  /**
   * Register physical device for push notifications and upload token to backend.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Trimly Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#A3B39C",
          sound: "default",
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        return null;
      }

      let token: string | null = null;
      try {
        const pushTokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "b2510eee-7bcd-4a5a-a045-539c6ea2e9d5",
        });
        token = pushTokenData?.data || null;

        if (token) {
          await this.registerDevice(
            token,
            Platform.OS === "ios" ? "ios" : "android"
          ).catch(() => null);
        }
      } catch (e: any) {
        console.log("[Push] Could not retrieve Expo push token:", e?.message);
      }

      return token;
    } catch {
      return null;
    }
  },

  /**
   * Trigger an instant local phone notification.
   */
  async presentLocalNotification(title: string, body: string, data?: Record<string, any>): Promise<string | null> {
    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority?.MAX ?? 2,
        },
        trigger: null, // trigger immediately
      });
    } catch {
      return null;
    }
  },

  /**
   * Schedules a phone notification after a delay (e.g. 5 seconds),
   * allowing the user to exit the app / lock phone to test background OS notifications.
   */
  async scheduleDelayedPhoneNotification(
    seconds: number = 5,
    title: string = "Trimly VIP Grooming 💈",
    body: string = "Your appointment with Elias Vance is confirmed for today at 4:30 PM!"
  ): Promise<string> {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Trimly Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#A3B39C",
          sound: "default",
        });
      }

      await Notifications.requestPermissionsAsync();

      return await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority?.MAX ?? 2,
          data: { actionRoute: "/(barbers)/bookings" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(seconds, 2),
        },
      });
    } catch {
      return "";
    }
  },

  /**
   * Schedules native phone notifications for an appointment:
   * 1. Immediate confirmation alert on phone banner/tray.
   * 2. Shaving/haircut reminder ahead of the appointment time.
   */
  async scheduleAppointmentReminder({
    appointmentDate,
    barberName,
    serviceName,
    timeString,
  }: {
    appointmentDate?: string | Date;
    barberName: string;
    serviceName: string;
    timeString: string;
  }): Promise<void> {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Trimly Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#A3B39C",
          sound: "default",
        });
      }

      await Notifications.requestPermissionsAsync();

      // 1. Immediate OS phone notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Appointment Booked! 💈",
          body: `Your ${serviceName} with ${barberName} is confirmed for ${timeString}. You will receive a reminder before your shaving time!`,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { actionRoute: "/(barbers)/bookings" },
        },
        trigger: null,
      });

      // 2. Scheduled shaving reminder before appointment
      if (appointmentDate) {
        const targetDate = typeof appointmentDate === "string" ? new Date(appointmentDate) : appointmentDate;
        if (targetDate && !isNaN(targetDate.getTime())) {
          const now = Date.now();
          const appointmentTimeMs = targetDate.getTime();
          // Reminder 1 hour before, or if within 1 hour, 15 mins before
          let reminderTimeMs = appointmentTimeMs - 60 * 60 * 1000;
          if (reminderTimeMs < now) {
            reminderTimeMs = appointmentTimeMs - 15 * 60 * 1000;
          }

          const secondsUntil = Math.floor((reminderTimeMs - now) / 1000);
          if (secondsUntil > 5) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Shaving Time Reminder ✂️💈",
                body: `Your appointment with ${barberName} for ${serviceName} is coming up at ${timeString}. Time to get ready!`,
                sound: "default",
                priority: Notifications.AndroidNotificationPriority.MAX,
                data: { actionRoute: "/(barbers)/bookings" },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: secondsUntil,
              },
            });
          }
        }
      }
    } catch {
      // Handled cleanly for simulator / permission denies
    }
  },

  /**
   * Fetch all notifications for the logged-in user from backend database.
   * Endpoint: GET /api/v1/notifications/
   */
  async getNotifications(): Promise<any[]> {
    try {
      const res = await apiRequest<any>("/api/v1/notifications/", {
        method: "GET",
      });
      if (res && Array.isArray(res.notifications)) return res.notifications;
      if (Array.isArray(res)) return res;
    } catch {
      // Handled cleanly
    }
    return [];
  },

  /**
   * Mark all notifications as read.
   * Endpoint: PATCH /api/v1/notifications/mark-all-read
   */
  async markAllRead(): Promise<any> {
    return apiRequest("/api/v1/notifications/mark-all-read", {
      method: "PATCH",
    });
  },

  /**
   * Mark a single notification as read.
   * Endpoint: PATCH /api/v1/notifications/{notification_id}/read
   */
  async markNotificationRead(notificationId: number | string): Promise<any> {
    const numId = typeof notificationId === "number" ? notificationId : parseInt(notificationId.toString().replace(/\D/g, ""), 10);
    if (!isNaN(numId) && numId < 1000000000) {
      return apiRequest(`/api/v1/notifications/${numId}/read`, {
        method: "PATCH",
      }).catch(() => null);
    }
    return { status: "success" };
  },

  /**
   * Register or re-link a push device token.
   * Endpoint: POST /api/v1/notifications/register-device
   */
  async registerDevice(token: string, platform?: "ios" | "android"): Promise<any> {
    return apiRequest("/api/v1/notifications/register-device", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    });
  },

  /**
   * Unregister a device push token on logout.
   * Endpoint: DELETE /api/v1/notifications/register-device/{token}
   */
  async unregisterDevice(token: string): Promise<any> {
    return apiRequest(`/api/v1/notifications/register-device/${encodeURIComponent(token)}`, {
      method: "DELETE",
    });
  },

  /**
   * Sends a test email to verify transactional email delivery.
   * Endpoint: POST /api/v1/notifications/test-email
   */
  async sendTestEmail(toEmail?: string): Promise<any> {
    return apiRequest("/api/v1/notifications/test-email", {
      method: "POST",
      body: JSON.stringify({ to_email: toEmail || undefined }),
    });
  },
};
