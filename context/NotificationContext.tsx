import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Notifications } from "@/services/notificationsWrapper";
import { isRunningInExpoGo } from "expo";
import { notificationService } from "@/services/notificationService";
import { websocketService } from "@/services/websocketService";
import { barberService } from "@/services/barberService";
import { router } from "expo-router";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  createdAt: number;
  read: boolean;
  type: "booking" | "promo" | "barber" | "reminder" | "review" | "system" | "staff_invite" | "staff_joined" | "staff_declined";
  iconBg: string;
  iconName: keyof typeof Ionicons.glyphMap;
  section: "Today" | "Yesterday" | "Earlier";
  actionRoute?: string;
  roleTarget?: "client" | "barber" | "all";
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (item: Partial<NotificationItem>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const refreshNotifications = useCallback(async () => {
    try {
      const dbNotifs = await notificationService.getNotifications();
      let mapped: NotificationItem[] = [];
      if (Array.isArray(dbNotifs)) {
        mapped = dbNotifs.map((n: any, idx: number) => {
          const isInvite = n.type === "staff_invite";
          return {
            id: n.id ? n.id.toString() : `db-notif-${idx}`,
            title: n.title || (isInvite ? "Salon Staff Invitation" : "Trimly Alert"),
            description: n.description || n.body || "",
            timeAgo: "Recently",
            createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
            read: !!n.read || !!n.is_read,
            type: (n.type as any) || "system",
            iconBg: isInvite ? "rgba(59, 130, 246, 0.25)" : "rgba(163, 179, 156, 0.2)",
            iconName: isInvite ? "people" : "notifications-outline",
            section: "Today",
            actionRoute: n.action_route || "/(barbers)/bookings",
            roleTarget: "all",
          };
        });
      }

      // Merge pending staff invitations from backend
      try {
        const myInvites = await barberService.getPendingInvitesForClient("me");
        if (Array.isArray(myInvites) && myInvites.length > 0) {
          myInvites.forEach((inv: any) => {
            const exists = mapped.some(
              (m) =>
                m.type === "staff_invite" &&
                m.actionRoute === `/accept-salon-invite/${inv.salonId}`
            );
            if (!exists) {
              mapped.unshift({
                id: `invite-${inv.id}`,
                title: `Invitation from ${inv.salonName || "Salon"}`,
                description: `${inv.salonName || "A salon"} invited you to join as a ${inv.role || "Stylist"}. Tap to accept.`,
                timeAgo: "Recently",
                createdAt: inv.createdAt ? new Date(inv.createdAt).getTime() : Date.now(),
                read: false,
                type: "staff_invite",
                iconBg: "rgba(59, 130, 246, 0.25)",
                iconName: "people",
                section: "Today",
                actionRoute: `/accept-salon-invite/${inv.salonId}`,
                roleTarget: "all",
              });
            }
          });
        }
      } catch {
        // Safe ignore
      }

      setNotifications(mapped);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();

    // Register physical device push token
    notificationService.registerForPushNotificationsAsync().catch(() => null);

    // Connect to real-time notification socket
    websocketService.connect();

    // Listen to push notifications in foreground (if supported)
    let notifSubscription: any = null;
    try {
      notifSubscription = Notifications.addNotificationReceivedListener((notification: any) => {
        const { title, body, data } = notification.request.content;
        const isInvite = data?.type === "staff_invite";
        const incomingItem: NotificationItem = {
          id: `push-${Date.now()}`,
          title: title || (isInvite ? "Salon Staff Invitation" : "Trimly Alert"),
          description: body || "",
          timeAgo: "Just now",
          createdAt: Date.now(),
          read: false,
          type: ((data?.type as any) || "system"),
          iconBg: isInvite ? "rgba(59, 130, 246, 0.25)" : "rgba(163, 179, 156, 0.2)",
          iconName: isInvite ? "people" : "notifications-outline",
          section: "Today",
          actionRoute: (data?.actionRoute as string) || (data?.action_route as string) || "/(barbers)/bookings",
          roleTarget: "all",
        };
        setNotifications((prev) => [incomingItem, ...prev]);
      });
    } catch {
      // Foreground notification listener not available
    }

    // Listen to notification interactions (tapping a push banner from lock screen or status tray)
    let responseSubscription: any = null;
    try {
      responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response?.notification?.request?.content?.data;
        const targetRoute = data?.actionRoute || data?.action_route || "/(barbers)/bookings";
        if (targetRoute) {
          try {
            router.push(targetRoute as any);
          } catch {
            // Fallback
          }
        }
      });

      // Cold start check (when app launched directly by tapping notification)
      Notifications.getLastNotificationResponseAsync?.().then((resp: any) => {
        if (resp) {
          const data = resp?.notification?.request?.content?.data;
          const targetRoute = data?.actionRoute || data?.action_route;
          if (targetRoute) {
            try {
              router.push(targetRoute as any);
            } catch {
              // Fallback
            }
          }
        }
      }).catch(() => null);
    } catch {
      // Notification interaction listeners not available
    }

    const unsubscribeWs = websocketService.subscribe((incoming) => {
      if (incoming) {
        const newNotif: NotificationItem = {
          id: incoming.id ? incoming.id.toString() : `ws-${Date.now()}`,
          title: incoming.title || "New Notification",
          description: incoming.description || incoming.body || "",
          timeAgo: "Just now",
          createdAt: Date.now(),
          read: false,
          type: (incoming.type as any) || "system",
          iconBg: "rgba(163, 179, 156, 0.2)",
          iconName: "notifications-outline",
          section: "Today",
          actionRoute: incoming.action_route || "/(barbers)/bookings",
          roleTarget: "all",
        };
        setNotifications((prev) => [newNotif, ...prev]);
        // Also present a local alert on screen
        notificationService.presentLocalNotification(
          newNotif.title,
          newNotif.description,
          { actionRoute: newNotif.actionRoute }
        ).catch(() => null);
      }
    });

    return () => {
      unsubscribeWs();
      if (notifSubscription && typeof notifSubscription.remove === "function") {
        notifSubscription.remove();
      }
      if (responseSubscription && typeof responseSubscription.remove === "function") {
        responseSubscription.remove();
      }
    };
  }, [refreshNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (item: Partial<NotificationItem>) => {
    const newItem: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: item.title || "Notification",
      description: item.description || "",
      timeAgo: "Just now",
      createdAt: Date.now(),
      read: false,
      type: item.type || "system",
      iconBg: item.iconBg || "rgba(163, 179, 156, 0.2)",
      iconName: item.iconName || "notifications-outline",
      section: "Today",
      actionRoute: item.actionRoute,
      roleTarget: item.roleTarget || "all",
    };

    setNotifications((prev) => [newItem, ...prev]);

    // Present OS-level native phone alert
    notificationService.presentLocalNotification(
      newItem.title,
      newItem.description,
      { actionRoute: newItem.actionRoute, type: newItem.type }
    ).catch(() => null);
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await notificationService.markNotificationRead(id);
    } catch {
      // Handled
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationService.markAllRead();
    } catch {
      // Handled
    }
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
