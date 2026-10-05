import { useState, useEffect } from "react";
import { notificationService } from "@/services/notificationService";
import { websocketService } from "@/services/websocketService";

export function usePushNotifications(userId?: number | null) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    // Register push notification token on device
    notificationService.registerForPushNotificationsAsync()
      .then((token) => setExpoPushToken(token))
      .catch(() => null);

    // Connect to real-time notification socket
    websocketService.connect();

    const unsubscribe = websocketService.subscribe((incoming) => {
      if (incoming) {
        setNotification(incoming);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return { expoPushToken, notification };
}
