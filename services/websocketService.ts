import { API_BASE_URL, getAuthToken, getStoredAuthToken } from "./api";

type NotificationListener = (notification: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Set<NotificationListener> = new Set();
  private reconnectTimeout: any = null;
  private heartbeatInterval: any = null;
  private isExplicitlyClosed: boolean = false;
  private reconnectAttempts: number = 0;

  public async connect() {
    this.isExplicitlyClosed = false;

    const token = getAuthToken() || (await getStoredAuthToken());
    if (!token) {
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      // Derive WebSocket URL from API_BASE_URL (http -> ws, https -> wss)
      const wsBase = API_BASE_URL.replace(/^http/, "ws");
      const wsUrl = `${wsBase}/api/v1/notifications/ws`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        // Send secure token in authentication handshake frame to prevent query-string exposure
        try {
          this.socket?.send(JSON.stringify({ type: "auth", token }));
        } catch {
          // Fallback ignore
        }
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "new_notification" && data.notification) {
            this.notifyListeners(data.notification);
          }
        } catch {
          // Non-JSON or ping message
        }
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public subscribe(listener: NotificationListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(notification: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch {
        // Safe dispatch
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send("ping");
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || this.isExplicitlyClosed) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }
}

export const websocketService = new WebSocketService();
