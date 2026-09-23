import React, { createContext, useContext, useEffect, useState } from "react";
import { authService, LoginResponse, UserCreateInput, UserRead } from "@/services/authService";
import { setAuthToken, getStoredAuthToken } from "@/services/api";
import { websocketService } from "@/services/websocketService";
import { notificationService } from "@/services/notificationService";

interface AuthContextType {
  user: UserRead | null;
  token: string | null;
  role: "client" | "barber" | "salon" | string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  loginWithGoogle: (token: string, role?: string) => Promise<LoginResponse>;
  signup: (data: UserCreateInput) => Promise<UserRead>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<UserRead>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(data: any): UserRead | null {
  if (!data) return null;
  const raw = data.user || data;
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id,
    email: raw.email || "",
    role: raw.role || "client",
    name: raw.name || null,
    phone: raw.phone || null,
    logo_url: raw.logo_url || raw.avatar_url || null,
    avatar_url: raw.avatar_url || raw.logo_url || null,
    about_us: raw.about_us || null,
    capacity: raw.capacity ?? raw.working_chairs ?? null,
    working_chairs: raw.working_chairs ?? raw.capacity ?? null,
    latitude: raw.latitude || null,
    longitude: raw.longitude || null,
    parent_salon_id: raw.parent_salon_id || null,
    parent_salon_name: raw.parent_salon_name || null,
    staff_title: raw.staff_title || null,
    staff_status: raw.staff_status || "Active",
    is_sub_barber: Boolean(raw.is_sub_barber || raw.parent_salon_id || raw.staff_title),
    created_at: raw.created_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check if saved token is in storage and fetch user data
  const refreshUser = async () => {
    try {
      const savedToken = await getStoredAuthToken();
      if (savedToken) {
        setToken(savedToken);
        await setAuthToken(savedToken);
        const userData = await authService.getMe();
        const parsed = normalizeUser(userData);
        setUser(parsed);
        websocketService.connect();
        notificationService.registerForPushNotificationsAsync().catch(() => null);
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (e) {
      setUser(null);
      setToken(null);
      await setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      setToken(res.access_token);
      await setAuthToken(res.access_token);

      if (res.user) {
        setUser(normalizeUser(res.user));
      }

      // Fetch fresh full user profile
      try {
        const userData = await authService.getMe();
        const parsed = normalizeUser(userData);
        if (parsed) setUser(parsed);
      } catch {
        // Keep login response user if getMe fails temporarily
      }

      websocketService.connect();
      notificationService.registerForPushNotificationsAsync().catch(() => null);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: UserCreateInput) => {
    setIsLoading(true);
    try {
      const newUser = await authService.signup(data);
      const parsedNewUser = normalizeUser(newUser);
      // Automatically login after signup
      try {
        const res = await authService.login(data.email, data.password);
        setToken(res.access_token);
        await setAuthToken(res.access_token);
        const freshUser = await authService.getMe().catch(() => null);
        setUser(normalizeUser(freshUser) || normalizeUser(res.user) || parsedNewUser);
        websocketService.connect();
        notificationService.registerForPushNotificationsAsync().catch(() => null);
      } catch (loginErr) {
        setUser(parsedNewUser);
      }
      return parsedNewUser || (newUser as UserRead);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googleToken: string, userRole: string = "client") => {
    setIsLoading(true);
    try {
      const res = await authService.loginWithGoogle(googleToken, userRole);
      setToken(res.access_token);
      await setAuthToken(res.access_token);

      if (res.user) {
        setUser(normalizeUser(res.user));
      }

      try {
        const userData = await authService.getMe();
        const parsed = normalizeUser(userData);
        if (parsed) setUser(parsed);
      } catch {
        // Fallback to response user
      }

      websocketService.connect();
      notificationService.registerForPushNotificationsAsync().catch(() => null);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (data: Partial<UserRead>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : (data as UserRead)));
  };

  const logout = () => {
    websocketService.disconnect();
    authService.logout();
    setToken(null);
    setUser(null);
  };

  const role = user?.role || "client";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isLoading,
        login,
        loginWithGoogle,
        signup,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
