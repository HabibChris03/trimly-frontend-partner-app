import { apiRequest } from "./api";

export interface AvailabilityCreateInput {
  day_of_week?: number | null; // 0 = Monday, 6 = Sunday or ISO format
  specific_date?: string | null; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  is_blocked?: boolean;
}

export interface AvailabilityWindow {
  id: number;
  barber_id: number;
  day_of_week?: number | null;
  specific_date?: string | null;
  start_time: string;
  end_time: string;
  is_blocked: boolean;
}

export const availabilityService = {
  /**
   * Add an availability / working window for the logged-in barber.
   */
  async createWindow(
    data: AvailabilityCreateInput
  ): Promise<AvailabilityWindow> {
    return apiRequest<AvailabilityWindow>("/api/v1/availability/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get all working windows for the current logged-in barber.
   */
  async getMyAvailability(): Promise<AvailabilityWindow[]> {
    return apiRequest<AvailabilityWindow[]>("/api/v1/availability/me", {
      method: "GET",
    });
  },

  /**
   * Public: Get availability windows for a given barber ID.
   */
  async getBarberAvailability(
    barberId: number
  ): Promise<AvailabilityWindow[]> {
    return apiRequest<AvailabilityWindow[]>(
      `/api/v1/availability/${barberId}`,
      {
        method: "GET",
      }
    );
  },

  /**
   * Public: Get bookable start times for a given date, category, and service duration.
   * Endpoint: GET /api/v1/availability/{barber_id}/slots
   */
  async getBookableSlots(
    barberId: number,
    date: string,
    serviceDurationMinutes?: number,
    serviceCategory?: string,
    serviceId?: number | string
  ): Promise<{
    date: string;
    duration_minutes?: number;
    category?: string;
    slots: { time: string; end_time?: string; available: boolean; is_full?: boolean; booked_count?: number; duration_minutes?: number }[];
  }> {
    const params: Record<string, any> = { date };
    if (serviceDurationMinutes && serviceDurationMinutes > 0) {
      params.service_duration_minutes = serviceDurationMinutes;
    }
    if (serviceCategory) {
      params.service_category = serviceCategory;
    }
    if (serviceId) {
      params.service_id = serviceId;
    }

    try {
      const res = await apiRequest<any>(
        `/api/v1/availability/${barberId}/slots`,
        {
          method: "GET",
          params,
        }
      );
      if (res && Array.isArray(res.slots) && res.slots.length > 0) {
        return res;
      }
    } catch {
      // Fallback below
    }

    // Dynamic fallback generation based on the barber's duration for this category
    const dur = Math.max(15, serviceDurationMinutes || 45);
    const windows = [
      { start: 9 * 60, end: 12 * 60 },
      { start: 13 * 60, end: 18 * 60 },
    ];
    const dynamicSlots: { time: string; end_time: string; available: boolean; duration_minutes: number }[] = [];

    const formatTime = (h: number, m: number) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    for (const win of windows) {
      let cur = win.start;
      while (cur + dur <= win.end) {
        const end = cur + dur;
        dynamicSlots.push({
          time: formatTime(Math.floor(cur / 60), cur % 60),
          end_time: formatTime(Math.floor(end / 60), end % 60),
          duration_minutes: dur,
          available: true,
        });
        cur += dur;
      }
    }

    return {
      date,
      duration_minutes: dur,
      category: serviceCategory,
      slots: dynamicSlots,
    };
  },

  /**
   * Delete an availability window.
   */
  async deleteWindow(windowId: number): Promise<any> {
    return apiRequest(`/api/v1/availability/${windowId}`, {
      method: "DELETE",
    });
  },
};
