import { apiRequest } from "./api";

export interface MobileBanner {
  id: number | string;
  title: string;
  targetScreen?: string;
  imageUrl: string;
  displayOrder?: number;
  actionRoute?: string;
  badgeText?: string;
  status: string;
}

export interface SystemStatusResult {
  status: "operational" | "maintenance";
  maintenance_mode: boolean;
  maintenance_message: string;
  estimated_end?: string | null;
  min_app_version?: string;
  latest_app_version?: string;
  force_update?: boolean;
  support_phone?: string;
  support_email?: string;
}

export interface SupportTicketInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export const marketingService = {
  /**
   * Fetch live promotional banners configured in Super Admin BannerManager.
   */
  async getBanners(): Promise<MobileBanner[]> {
    try {
      const res = await apiRequest<{ status: string; banners: MobileBanner[] }>("/api/v1/marketing/banners");
      if (res && Array.isArray(res.banners) && res.banners.length > 0) {
        return res.banners;
      }
    } catch {
      // Handled cleanly
    }
    return [];
  },

  /**
   * Check system status and maintenance mode from Super Admin.
   */
  async getSystemStatus(): Promise<SystemStatusResult | null> {
    try {
      return await apiRequest<SystemStatusResult>("/api/v1/marketing/system/status");
    } catch {
      return null;
    }
  },

  /**
   * Submit partner support ticket or dispute directly to Super Admin SupportTickets.
   */
  async submitSupportTicket(data: SupportTicketInput): Promise<any> {
    return apiRequest("/api/v1/contact/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
