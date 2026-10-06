import { apiRequest, setAuthToken, setActiveMode } from "./api";

export interface UserCreateInput {
  email: string;
  role: "client" | "barber" | "salon" | "hairdresser";
  password: string;
  name?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  parent_salon_id?: number | null;
}

export interface UserRead {
  id: number;
  email: string;
  role: "client" | "barber" | "salon" | string;
  name?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  avatar_url?: string | null;
  about_us?: string | null;
  capacity?: number | null;
  working_chairs?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  parent_salon_id?: number | null;
  parent_salon_name?: string | null;
  staff_title?: string | null;
  staff_status?: string | null;
  is_sub_barber?: boolean;
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user?: UserRead;
  status?: string;
}

export const authService = {
  /**
   * Register a new client, barber, or salon account.
   */
  async signup(data: UserCreateInput): Promise<UserRead> {
    const res = await apiRequest<any>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res?.access_token) {
      await setAuthToken(res.access_token);
    }
    return res?.user || res;
  },

  /**
   * Login with email and password using OAuth2 Password form.
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const formBody = new URLSearchParams();
    formBody.append("username", email);
    formBody.append("password", password);
    formBody.append("app", "partner");

    const result = await apiRequest<any>("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-App-Type": "partner",
      },
      body: formBody.toString(),
    });

    if (result?.access_token) {
      await setAuthToken(result.access_token);
    }

    return {
      access_token: result.access_token,
      token_type: result.token_type || "bearer",
      user: result.user || undefined,
      status: result.status,
    };
  },

  /**
   * Check if current session token is valid and fetch user details.
   */
  async getMe(): Promise<UserRead> {
    const res = await apiRequest<any>("/api/v1/auth/me", {
      method: "GET",
      headers: {
        "X-App-Type": "partner",
      },
    });
    return res?.user || res;
  },

  /**
   * Request password reset instructions.
   */
  async forgotPassword(email: string): Promise<{ status: string; message: string }> {
    return apiRequest<{ status: string; message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Verify whether an entered 6-digit reset code is valid.
   */
  async verifyResetCode(email: string, code: string): Promise<{ status: string; valid: boolean; message: string }> {
    return apiRequest<{ status: string; valid: boolean; message: string }>("/api/v1/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code, reset_code: code }),
    });
  },

  /**
   * Reset user password with 6-digit reset code and set new password.
   */
  async resetPassword(email: string, resetCode: string, newPassword: string): Promise<{ status: string; message: string }> {
    return apiRequest<{ status: string; message: string }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, code: resetCode, reset_code: resetCode, new_password: newPassword }),
    });
  },

  /**
   * Accept salon invite and set real staff password.
   * Endpoint: POST /api/v1/auth/accept-invite
   */
  async acceptInvite(token: string, newPassword: string): Promise<LoginResponse> {
    const res = await apiRequest<LoginResponse>("/api/v1/auth/accept-invite", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    if (res.access_token) {
      await setAuthToken(res.access_token);
    }
    return res;
  },

  /**
   * Login or signup via Google OAuth ID token / access token.
   * Endpoint: POST /api/v1/auth/google
   */
  async loginWithGoogle(
    token: string,
    role: string = "barber",
    accessToken?: string
  ): Promise<LoginResponse> {
    const isJwt = typeof token === "string" && token.includes(".") && token.split(".").length === 3;
    const body: Record<string, any> = {
      role,
      app: "partner",
      token,
    };

    if (isJwt) {
      body.id_token = token;
      if (accessToken) body.access_token = accessToken;
    } else {
      body.access_token = token;
      if (accessToken) body.id_token = accessToken;
    }

    const result = await apiRequest<any>("/api/v1/auth/google", {
      method: "POST",
      headers: {
        "X-App-Type": "partner",
      },
      body: JSON.stringify(body),
    });

    if (result?.access_token) {
      await setAuthToken(result.access_token);
    }

    return {
      access_token: result.access_token,
      token_type: result.token_type || "bearer",
      user: result.user || undefined,
      status: result.status,
    };
  },

  /**
   * Clear active auth session on client and server.
   */
  async logout() {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    await setAuthToken(null);
    await setActiveMode(null);
  },
};
