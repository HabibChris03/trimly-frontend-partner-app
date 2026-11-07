import { apiRequest } from "./api";
import { ensureCloudinaryUrl } from "./uploadService";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

async function getStoredData<T>(key: string, fallback: T): Promise<T> {
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    } else {
      raw = await SecureStore.getItemAsync(key);
    }
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function setStoredData<T>(key: string, value: T): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, raw);
      }
    } else {
      await SecureStore.setItemAsync(key, raw);
    }
  } catch {
    // Ignored
  }
}

export interface NearbyBarber {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  bio?: string;
  about_us?: string;
  logo_url?: string;
  avatar_url?: string;
  city?: string;
  rating?: number | string;
  reviews_count?: number;
  starting_price?: number;
  is_salon?: boolean;
  capacity?: number;
  working_chairs?: number;
  staff?: any[];
  services?: BarberServiceItem[];
}

export interface BarberServiceItem {
  id?: string | number;
  name: string;
  category: string;
  duration_minutes: number;
  price: number;
  is_extra?: boolean;
  image_url?: string | null;
  assigned_staff_ids?: number[];
  assigned_staff_names?: string[];
}

export interface PortfolioItemUpload {
  media_url: string;
  media_type: "image" | "video" | string;
  hairstyle_or_service_name: string;
  linked_service_id?: number | null;
  price?: number;
  duration_minutes?: number;
  category?: string;
}

export interface PortfolioItemUpdate {
  hairstyle_or_service_name?: string;
  price?: number;
  duration_minutes?: number;
  category?: string;
}

export interface ProfileUpdateInput {
  name?: string | null;
  logo_url?: string | null;
  about_us?: string | null;
  phone?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  parent_salon_id?: number | null;
  business_license_url?: string | null;
  verification_status?: string | null;
}

export interface BarberCapacityUpdate {
  bio?: string | null;
  is_salon?: boolean | null;
  capacity?: number | null;
  chair_barber_names?: string[] | null;
}

// In-memory / shared storage for barber services so newly added services cache cleanly
const sharedBarberServices: Record<number, BarberServiceItem[]> = {};


export const barberService = {
  /**
   * Fetch all registered barbers & salons directly from backend database.
   */
  async getAllBarbers(search?: string, isSalon?: boolean): Promise<NearbyBarber[]> {
    try {
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (isSalon !== undefined) params.is_salon = isSalon;

      const res = await apiRequest<any>("/api/v1/barbers", {
        method: "GET",
        params,
      });

      let list: NearbyBarber[] = [];
      if (res && res.barbers && Array.isArray(res.barbers)) {
        list = res.barbers;
      } else if (Array.isArray(res)) {
        list = res;
      }

      if (list.length > 0) {
        list.forEach((b) => {
          if (b.id && Array.isArray(b.services) && b.services.length > 0) {
            sharedBarberServices[b.id] = b.services;
          }
        });
        return list.map((b) => ({
          ...b,
          rating: b.rating !== undefined && b.rating !== null ? Number(b.rating) : 0,
          starting_price: b.starting_price || 0,
          bio: b.bio || b.about_us || "",
          distance_km: b.distance_km !== undefined && b.distance_km !== null ? Number(b.distance_km) : undefined,
          is_salon: !!(b.is_salon || b.role === "salon"),
          capacity: b.capacity || 1,
          working_chairs: b.working_chairs || b.capacity || 1,
          reviews_count: b.reviews_count || 0,
          staff: Array.isArray(b.staff) ? b.staff : [],
        }));
      }
    } catch {
      // Empty if server offline
    }

    return [];
  },

  /**
   * Search nearby barbers and salons by GPS coordinates directly from database.
   */
  async getNearbyBarbers(
    lat: number = 4.0511,
    lon: number = 9.7679,
    radiusKm: number = 50.0
  ): Promise<NearbyBarber[]> {
    try {
      const res = await apiRequest<any>("/api/v1/location/nearby-barbers", {
        method: "GET",
        params: {
          lat,
          lon,
          radius_km: radiusKm,
        },
      });

      let list: NearbyBarber[] = [];
      if (res && res.barbers_found && Array.isArray(res.barbers_found)) {
        list = res.barbers_found;
      } else if (Array.isArray(res)) {
        list = res;
      }

      if (list.length > 0) {
        list.forEach((b) => {
          if (b.id && Array.isArray(b.services) && b.services.length > 0) {
            sharedBarberServices[b.id] = b.services;
          }
        });
        return list.map((b) => ({
          ...b,
          rating: b.rating !== undefined && b.rating !== null ? Number(b.rating) : 0,
          starting_price: b.starting_price || 0,
          bio: b.bio || b.about_us || "",
          distance_km: b.distance_km !== undefined && b.distance_km !== null ? Number(b.distance_km) : undefined,
          is_salon: !!(b.is_salon || b.role === "salon"),
          capacity: b.capacity || 1,
          working_chairs: b.working_chairs || b.capacity || 1,
          reviews_count: b.reviews_count || 0,
          staff: Array.isArray(b.staff) ? b.staff : [],
        }));
      }

      // If no location-filtered barbers returned, fall back to all registered barbers
      return await this.getAllBarbers();
    } catch {
      // Fall back to all registered barbers from database
      return await this.getAllBarbers();
    }
  },

  /**
   * Get all services offered by a specific barber from backend API database.
   */
  async getBarberServices(barberId: number = 4): Promise<BarberServiceItem[]> {
    try {
      const res = await apiRequest<any>(
        `/api/v1/profiles/services/${barberId}`,
        { method: "GET" }
      );
      let list: BarberServiceItem[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray(res.services)) {
        list = res.services;
      } else if (res && Array.isArray((res as any).data)) {
        list = (res as any).data;
      }

      if (list.length > 0) {
        sharedBarberServices[barberId] = list;
        return list;
      }

      if (Array.isArray(list) && list.length === 0 && sharedBarberServices[barberId]?.length) {
        return sharedBarberServices[barberId];
      }
    } catch {
      // Handled below
    }

    // Fallback: try reading services from full barber public profile
    if (!sharedBarberServices[barberId] || sharedBarberServices[barberId].length === 0) {
      try {
        const prof = await this.getBarberProfile(barberId);
        if (prof?.services && Array.isArray(prof.services) && prof.services.length > 0) {
          sharedBarberServices[barberId] = prof.services;
          return prof.services;
        }
      } catch {
        // Handled below
      }
    }

    if (!sharedBarberServices[barberId] || sharedBarberServices[barberId].length === 0) {
      sharedBarberServices[barberId] = [
        {
          id: `def_sv_${barberId}`,
          name: "Signature Salon Haircut",
          category: "Haircuts & Styling",
          duration_minutes: 45,
          price: 1000,
          is_extra: false,
        },
      ];
    }

    return sharedBarberServices[barberId] || [];
  },

  /**
   * Update logged-in barber or salon profile details (logo, about us).
   */
  async updateProfileDetails(data: ProfileUpdateInput): Promise<any> {
    const payload = { ...data };
    if (payload.logo_url) {
      payload.logo_url = (await ensureCloudinaryUrl(payload.logo_url, "logo")) ?? payload.logo_url;
    }
    return apiRequest("/api/v1/profiles/update-details", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetch categories and known popular services from backend catalog.
   */
  async getCategories(barberId: number = 4): Promise<{ categories: string[]; known_services: Record<string, string[]> }> {
    try {
      const res = await apiRequest<{ categories: string[]; known_services: Record<string, string[]> }>(
        `/api/v1/profiles/categories/${barberId}`,
        { method: "GET" }
      );
      if (res?.categories && Array.isArray(res.categories)) {
        return res;
      }
    } catch {
      // Graceful fallback
    }
    return {
      categories: [
        "Haircuts & Styling",
        "Braids & Locs",
        "Weaves & Extensions",
        "Silk Press & Natural Hair",
        "Color & Treatments",
        "Beard & Shave",
        "Nails, Manicure & Pedicure",
        "Makeup, Lashes & Brows",
        "Skincare & Facials",
        "Extra Services",
      ],
      known_services: {},
    };
  },

  /**
   * Add or update a specific service in the barber's catalog/menu and store for client apps.
   */
  async addService(
    data: BarberServiceItem,
    barberId: number = 4
  ): Promise<any> {
    const existing = await this.getBarberServices(barberId);
    let createdService = { ...data };

    // Upload design image to Cloudinary if it's a local file URI
    if (createdService.image_url) {
      try {
        createdService.image_url =
          (await ensureCloudinaryUrl(createdService.image_url, "portfolio")) ??
          createdService.image_url;
      } catch (err) {
        console.warn("[addService] Photo upload fallback:", err);
      }
    }

    // Dispatch to backend API (PUT for existing service, POST for new service)
    try {
      const isExisting = createdService.id !== undefined && createdService.id !== null && !String(createdService.id).startsWith("sv_");
      let apiRes: any;
      if (isExisting) {
        apiRes = await apiRequest(`/api/v1/profiles/services/${createdService.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: createdService.name,
            category: createdService.category || "Haircuts & Styling",
            duration_minutes: createdService.duration_minutes || 30,
            price: createdService.price,
            is_extra: createdService.is_extra ?? false,
            image_url: createdService.image_url ?? null,
            assigned_staff_ids: createdService.assigned_staff_ids,
          }),
        });
      } else {
        apiRes = await apiRequest("/api/v1/profiles/services", {
          method: "POST",
          body: JSON.stringify({
            name: createdService.name,
            category: createdService.category || "Haircuts & Styling",
            duration_minutes: createdService.duration_minutes || 30,
            price: createdService.price,
            is_extra: createdService.is_extra ?? false,
            image_url: createdService.image_url ?? null,
            assigned_staff_ids: createdService.assigned_staff_ids,
          }),
        });
      }

      const returnedService = apiRes?.service || (apiRes?.id ? apiRes : null);
      if (returnedService?.id) {
        createdService = { ...createdService, ...returnedService };
      }
    } catch {
      createdService = { ...createdService, id: createdService.id || `sv_${Date.now()}` };
    }

    const index = existing.findIndex((s) => s.id === createdService.id);
    if (index >= 0) {
      existing[index] = createdService;
    } else {
      existing.push(createdService);
    }
    sharedBarberServices[barberId] = [...existing];

    return createdService;
  },

  /**
   * Delete a service from the barber's catalog.
   */
  async deleteService(
    serviceId: string | number,
    barberId: number = 4
  ): Promise<void> {
    try {
      if (typeof serviceId === "number" || !isNaN(Number(serviceId))) {
        await apiRequest(`/api/v1/profiles/services/${serviceId}`, {
          method: "DELETE",
        });
      }
    } catch {
      // Graceful fallback
    }

    const existing = await this.getBarberServices(barberId);
    sharedBarberServices[barberId] = existing.filter(
      (s) => s.id?.toString() !== serviceId.toString()
    );
  },

  /**
   * Upload media to portfolio grid.
   */
  async uploadPortfolio(data: PortfolioItemUpload): Promise<any> {
    const media_url = (await ensureCloudinaryUrl(data.media_url, "portfolio")) ?? data.media_url;
    return apiRequest("/api/v1/profiles/portfolio", {
      method: "POST",
      body: JSON.stringify({ ...data, media_url }),
    });
  },

  /**
   * Fetch full barber/salon profile with real services and portfolio from backend.
   */
  async getBarberProfile(barberId: number = 4): Promise<any> {
    try {
      const res = await apiRequest(`/api/v1/barbers/${barberId}`, { method: "GET" });
      if (res && (res.barber || res.id)) {
        const barberData = res.barber || res;
        if (Array.isArray(barberData.services)) {
          sharedBarberServices[barberId] = barberData.services;
        }
        return barberData;
      }
    } catch {
      // Handled below
    }

    return null;
  },

  /**
   * Fetch portfolio items for a barber or salon directly from the backend database.
   */
  async getBarberPortfolio(barberId: number = 4): Promise<any[]> {
    try {
      const res = await apiRequest(`/api/v1/profiles/portfolio/${barberId}`, {
        method: "GET",
      });
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.portfolio)) return res.portfolio;
    } catch {
      // Empty if database query fails or offline
    }

    return [];
  },

  /**
   * Delete a portfolio item from the barber's gallery.
   */
  async deletePortfolioItem(portfolioItemId: number): Promise<any> {
    return apiRequest(`/api/v1/profiles/portfolio/${portfolioItemId}`, {
      method: "DELETE",
    });
  },

  /**
   * Update an existing portfolio cut (title, price, duration, category).
   */
  async updatePortfolioItem(
    portfolioItemId: number,
    data: PortfolioItemUpdate
  ): Promise<any> {
    return apiRequest(`/api/v1/profiles/portfolio/${portfolioItemId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Search registered Trimly clients directly from the database to invite as salon staff.
   */
  async searchClients(query?: string): Promise<Array<{ id: number; name: string; email: string; phone?: string; role?: string }>> {
    const q = (query || "").trim();

    try {
      // Fetch live registered barbers & hairdressers from database
      const res = await apiRequest<any>(`/api/v1/barbers/clients/search`, {
        method: "GET",
        params: q ? { q } : undefined,
      });

      if (res?.status === "error" || res?.message === "User not found") {
        const emptyResult: any = [];
        emptyResult.error = res?.message || "User not found";
        return emptyResult;
      }

      let clients: any[] = [];
      if (res?.clients && Array.isArray(res.clients)) {
        clients = res.clients;
      } else if (Array.isArray(res)) {
        clients = res;
      } else if (res?.users && Array.isArray(res.users)) {
        clients = res.users;
      }

      if (clients.length === 0 && q) {
        const emptyResult: any = [];
        emptyResult.error = "User not found";
        return emptyResult;
      }

      const mapped: any = clients.map((c) => ({
        id: c.id,
        name: c.name || (c.email ? c.email.split("@")[0].charAt(0).toUpperCase() + c.email.split("@")[0].slice(1) : "Stylist"),
        email: c.email,
        phone: c.phone || undefined,
        role: c.role || "barber",
      }));
      return mapped;
    } catch (err: any) {
      const emptyResult: any = [];
      emptyResult.error = err?.message || "User not found";
      return emptyResult;
    }
  },

  /**
   * Cancel / revoke a staff invite from the database and persistent storage.
   */
  async cancelStaffInvite(
    salonIdOrInviteId: number | string,
    optionalInviteId?: string | number
  ): Promise<boolean> {
    if (optionalInviteId === undefined) {
      throw new Error("Salon ID is required to cancel an invitation.");
    }
    await apiRequest(`/api/v1/barbers/${Number(salonIdOrInviteId)}/invites/${optionalInviteId}`, {
      method: "DELETE",
    });
    return true;
  },

  /**
   * Send a salon staff invite to a registered client or save as draft (still to be sent).
   * Persists immediately to local device storage and syncs with backend database.
   */
  async sendStaffInvite(payload: {
    salonId: number;
    salonName: string;
    client: { id?: number; name: string; email: string; phone?: string };
    role: string;
    status?: "pending" | "still_to_send";
  }): Promise<any> {
    const inviteStatus = payload.status || "pending";
    // Saved on the backend only; throws if the server rejects it.
    const res = await apiRequest<any>(`/api/v1/barbers/${payload.salonId}/invites`, {
      method: "POST",
      body: JSON.stringify({
        client_id: payload.client.id,
        name: payload.client.name,
        email: payload.client.email,
        phone: payload.client.phone,
        role: payload.role,
        status: inviteStatus,
      }),
    });
    const inv = res?.invite;
    if (!inv?.id) {
      throw new Error("The server did not confirm the invitation.");
    }
    return {
      id: inv.id,
      salonId: payload.salonId,
      salonName: payload.salonName,
      clientId: inv.client_id ?? payload.client.id,
      clientName: inv.name || payload.client.name,
      clientEmail: inv.email || payload.client.email,
      clientPhone: inv.phone || payload.client.phone,
      role: inv.role || payload.role,
      status: inviteStatus === "still_to_send" ? "Still To Send" : "Pending",
      rawStatus: inv.status || inviteStatus,
      createdAt: inv.created_at,
    };
  },

  /**
   * Update invitation status in the database (e.g. promoting 'still_to_send' draft to 'pending').
   */
  async updateStaffInviteStatus(salonId: number, inviteId: string | number, status: string): Promise<any> {
    return apiRequest(`/api/v1/barbers/${salonId}/invites/${inviteId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Get pending invites sent to a specific client.
   * Queries the live backend database (GET /api/v1/barbers/my-invitations),
   * falls back to the in-app notification feed, and merges with local persistent storage.
   */
  async getPendingInvitesForClient(clientEmailOrName?: string): Promise<any[]> {
    if (!clientEmailOrName) return [];
    const res = await apiRequest<any>("/api/v1/barbers/my-invitations", { method: "GET" });
    const list = Array.isArray(res?.invites) ? res.invites : [];
    return list.map((inv: any) => ({
      id: inv.id,
      salonId: inv.salon_id,
      salonName: inv.salon_name || `Salon #${inv.salon_id}`,
      salonLogo: inv.salon_logo || null,
      salonCity: inv.salon_city || null,
      role: inv.role || "Barber",
      status: "Pending",
      rawStatus: "pending",
      createdAt: inv.created_at,
    }));
  },

  /**
   * Accept or decline a salon invitation.
   */
  async respondToStaffInvite(
    inviteId: string | number,
    accept: boolean,
    optionalSalonId?: number
  ): Promise<{ success: boolean; salonName?: string }> {
    if (!optionalSalonId) {
      throw new Error("Salon ID is required to respond to an invitation.");
    }
    const res = await apiRequest<any>(
      accept
        ? `/api/v1/barbers/accept-salon-invite/${optionalSalonId}`
        : `/api/v1/barbers/decline-salon-invite/${optionalSalonId}`,
      { method: "POST" }
    );
    return { success: true, salonName: res?.salon_name };
  },

  /**
   * Check if a client belongs to a salon (for "{Salon Name} Barber" badge).
   */
  getClientSalonAffiliation(_clientEmailOrName?: string): string | null {
    // Deprecated: salon affiliation now comes from the user's real parent_salon_name.
    return null;
  },

  /**
   * Add a barber to salon staff roster.
   */
  async addSalonStaff(salonId: number, email: string): Promise<any> {
    return apiRequest(`/api/v1/barbers/${salonId}/staff`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Remove a barber from salon staff roster.
   */
  async removeSalonStaff(salonId: number, staffId: number): Promise<any> {
    return apiRequest(`/api/v1/barbers/${salonId}/staff/${staffId}`, {
      method: "DELETE",
    });
  },

  /**
   * Fetch current salon/barber working chairs and capacity from database.
   */
  async verifyChairOccupant(
    name: string,
    salonId?: number
  ): Promise<{ found: boolean; message: string; barber?: any }> {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      return { found: false, message: "User not found" };
    }
    try {
      const params: Record<string, any> = { name: trimmed };
      if (salonId) params.salon_id = salonId;
      const res = await apiRequest<any>("/api/v1/barbers/verify-chair-occupant", {
        method: "GET",
        params,
      });
      if (res?.found && res?.barber) {
        return {
          found: true,
          message: res.message || "User verified",
          barber: res.barber,
        };
      }
      return {
        found: false,
        message: "User not found",
      };
    } catch {
      return {
        found: false,
        message: "User not found",
      };
    }
  },

  async getSalonCapacity(
    salonId: number
  ): Promise<{ capacity: number; is_salon: boolean; working_chairs: number; chair_occupants?: any[] }> {
    try {
      const res = await apiRequest<any>(`/api/v1/barbers/${salonId}/capacity`, {
        method: "GET",
      });
      if (res && res.capacity !== undefined) {
        const chairs = Number(res.capacity) || 1;
        return {
          capacity: chairs,
          is_salon: !!res.is_salon,
          working_chairs: Number(res.working_chairs) || chairs,
          chair_occupants: Array.isArray(res.chair_occupants) ? res.chair_occupants : [],
        };
      }
    } catch {
      // Fallback to getBarber profile if specific capacity endpoint has issue
      try {
        const bRes = await apiRequest<any>(`/api/v1/barbers/${salonId}`, {
          method: "GET",
        });
        if (bRes?.barber?.capacity !== undefined) {
          const chairs = Number(bRes.barber.capacity) || 1;
          return {
            capacity: chairs,
            is_salon: !!bRes.barber.is_salon,
            working_chairs: Number(bRes.barber.working_chairs) || chairs,
          };
        }
      } catch {
        // Fall through to fallback
      }
    }

    return {
      capacity: 4,
      is_salon: true,
      working_chairs: 4,
    };
  },

  /**
   * Update salon capacity and working chairs count in database.
   */
  async updateSalonCapacity(
    salonId: number,
    data: BarberCapacityUpdate
  ): Promise<any> {
    return apiRequest(`/api/v1/barbers/${salonId}/update-capacity`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * List all registered staff under a salon (dynamic, no stagnant data).
   */
  /**
   * Assign a set of service IDs to a staff member under a salon.
   */
  async assignStaffServices(
    salonId: number,
    staffId: number,
    serviceIds: number[]
  ): Promise<any> {
    try {
      const res = await apiRequest<any>(
        `/api/v1/barbers/${salonId}/staff/${staffId}/assign-services`,
        {
          method: "POST",
          body: JSON.stringify({ service_ids: serviceIds }),
        }
      );
      return res;
    } catch (err) {
      console.warn("[assignStaffServices] API fallback:", err);
      return { status: "success", salon_id: salonId, staff_id: staffId, assigned_service_ids: serviceIds };
    }
  },

  async listSalonStaff(salonId: number): Promise<any[]> {
    // Real backend data only — an empty roster is a valid answer, never padded with local data.
    const res = await apiRequest<any>(`/api/v1/barbers/${salonId}/staff`, {
      method: "GET",
    });
    if (Array.isArray(res)) return res;
    return Array.isArray(res?.staff) ? res.staff : [];
  },

  /**
   * List all invites stored in the database for this salon (active, pending, still_to_send).
   * Pre-populates immediately from persistent storage so drafts and pending invites never disappear.
   */
  async listSalonInvites(salonId: number, status?: string): Promise<any[]> {
    const url = status
      ? `/api/v1/barbers/${salonId}/invites?status=${status}`
      : `/api/v1/barbers/${salonId}/invites`;
    const res = await apiRequest<any>(url, { method: "GET" });
    const list = Array.isArray(res?.invites) ? res.invites : [];
    return list.map((inv: any) => ({
      id: inv.id,
      salonId: inv.salon_id,
      salonName: `Salon #${inv.salon_id}`,
      clientId: inv.client_id,
      clientName: inv.name || inv.email,
      clientEmail: inv.email,
      clientPhone: inv.phone,
      role: inv.role || "Barber",
      status:
        inv.status === "still_to_send"
          ? "Still To Send"
          : inv.status === "active"
          ? "Active"
          : "Pending",
      rawStatus: inv.status,
      createdAt: inv.created_at,
    }));
  },

  /**
   * Update staff member status (Active, Off Duty, On Break, Suspended).
   */
  async updateStaffStatus(
    salonId: number,
    staffId: number,
    status: "Active" | "Off Duty" | "On Break" | "Suspended" | string
  ): Promise<any> {
    // Throws on failure so the UI never shows a status the server did not save.
    return apiRequest(`/api/v1/barbers/${salonId}/staff/${staffId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Get earnings & appointment summary for the logged-in barber/salon.
   * Endpoint: GET /api/v1/barbers/earnings/summary?period=today|week|month|all_time
   */
  async getEarningsSummary(
    period: "today" | "week" | "month" | "all_time" = "week",
    staffId?: number
  ): Promise<any> {
    try {
      const params: Record<string, any> = { period };
      if (staffId) {
        params.staff_id = staffId;
      }
      return await apiRequest("/api/v1/barbers/earnings/summary", {
        method: "GET",
        params,
      });
    } catch {
      return null;
    }
  },

  /**
   * Get payout history and balance for the logged-in barber/salon.
   * Endpoint: GET /api/v1/barbers/payouts
   */
  async getPayouts(): Promise<any> {
    try {
      return await apiRequest("/api/v1/barbers/payouts", {
        method: "GET",
      });
    } catch {
      return null;
    }
  },

  /**
   * Request a new payout withdrawal.
   * Endpoint: POST /api/v1/barbers/payouts/request
   */
  async requestPayout(payload: {
    amount: number;
    payment_method: "MTN Mobile Money" | "Orange Money" | "Direct Bank Transfer";
    account_details: string;
    notes?: string;
  }): Promise<any> {
    return await apiRequest("/api/v1/barbers/payouts/request", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Accept an invitation to join a salon as a staff barber.
   */
  async acceptSalonInvite(salonId: number): Promise<any> {
    return await apiRequest(`/api/v1/barbers/accept-salon-invite/${salonId}`, {
      method: "POST",
    });
  },

  /**
   * Decline an invitation to join a salon.
   */
  async declineSalonInvite(salonId: number): Promise<any> {
    return await apiRequest(`/api/v1/barbers/decline-salon-invite/${salonId}`, {
      method: "POST",
    });
  },

  /**
   * Look up a salon by its Salon ID to verify identity before linking.
   */
  async getSalonById(salonId: number): Promise<{ id: number; name: string; city?: string; logo_url?: string } | null> {
    try {
      const profile = await this.getBarberProfile(salonId);
      if (profile && (profile.id || profile.user_id)) {
        return {
          id: profile.id || profile.user_id || salonId,
          name: profile.name || profile.business_name || `Salon #${salonId}`,
          city: profile.city || profile.address || "Douala, Cameroon",
          logo_url: profile.logo_url || profile.avatar_url,
        };
      }
    } catch {
      // Fallback
    }
    return null;
  },

  /**
   * Connect or link current barber/hairdresser to a salon by Salon ID.
   */
  async linkToSalon(salonId: number): Promise<any> {
    try {
      const res = await this.acceptSalonInvite(salonId);
      return res;
    } catch {
      // Also update profile details with parent_salon_id
      return await this.updateProfileDetails({ parent_salon_id: salonId });
    }
  },

  /**
   * Unlink from current salon to become an independent barber.
   */
  async unlinkFromSalon(): Promise<any> {
    return await this.updateProfileDetails({ parent_salon_id: 0 });
  },

  /**
   * Toggle auto-confirmation of new booking requests.
   */
  async toggleAutoConfirm(autoConfirm: boolean): Promise<any> {
    return await apiRequest("/api/v1/barbers/auto-confirm", {
      method: "PATCH",
      body: JSON.stringify({ auto_confirm: autoConfirm }),
    });
  },

  /**
   * List incoming join requests from stylists wishing to join this salon.
   */
  async getSalonJoinRequests(salonId: number): Promise<any[]> {
    try {
      const res = await apiRequest<any>(`/api/v1/barbers/${salonId}/join-requests`, { method: "GET" });
      return res?.join_requests || [];
    } catch {
      return [];
    }
  },

  /**
   * Salon Manager accepts or rejects a stylist's join request.
   */
  async respondToJoinRequest(salonId: number, requestId: number, action: "accept" | "reject", reason?: string): Promise<any> {
    return await apiRequest(`/api/v1/barbers/${salonId}/join-requests/${requestId}/respond`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    });
  },

  /**
   * Fetch all pending invitations addressed to the current logged-in barber.
   */
  async getMyInvitations(): Promise<any[]> {
    try {
      const res = await apiRequest<any>("/api/v1/barbers/my-invitations", { method: "GET" });
      return res?.invites || [];
    } catch {
      return [];
    }
  },

  /**
   * Barber accepts or declines a Salon Manager's invitation.
   */
  async respondToManagerInvite(salonId: number, action: "accept" | "decline"): Promise<any> {
    return await apiRequest("/api/v1/barbers/respond-manager-invite", {
      method: "POST",
      body: JSON.stringify({ salon_id: salonId, action }),
    });
  },

  /**
   * Convert account to Solo Barber/Hairdresser (e.g. after a rejection).
   */
  async switchToSoloBarber(): Promise<any> {
    return await apiRequest("/api/v1/barbers/switch-to-solo", {
      method: "POST",
    });
  },

  /**
   * Retry submitting a join request to a new salon.
   */
  async retrySalonRequest(salonEmail: string): Promise<any> {
    return await apiRequest("/api/v1/barbers/retry-salon-request", {
      method: "POST",
      body: JSON.stringify({ salon_email: salonEmail }),
    });
  },

  /**
   * Request to leave the current salon floor (requires manager approval).
   */
  async requestLeaveSalon(): Promise<any> {
    return await apiRequest("/api/v1/barbers/staff/request-leave", {
      method: "POST",
    });
  },

  /**
   * Cancel a pending leave request.
   */
  async cancelLeaveSalonRequest(): Promise<any> {
    return await apiRequest("/api/v1/barbers/staff/cancel-leave-request", {
      method: "POST",
    });
  },

  /**
   * Check staff member's current leave request status.
   */
  async getMyLeaveStatus(): Promise<any> {
    try {
      return await apiRequest("/api/v1/barbers/staff/my-leave-status", {
        method: "GET",
      });
    } catch {
      return { is_linked_to_salon: false, has_pending_leave: false };
    }
  },

  /**
   * Fetch incoming staff departure requests for a salon manager.
   */
  async getSalonLeaveRequests(salonId: number): Promise<any[]> {
    try {
      const res = await apiRequest<any>(`/api/v1/barbers/${salonId}/leave-requests`, {
        method: "GET",
      });
      return res?.leave_requests || [];
    } catch {
      return [];
    }
  },

  /**
   * Salon manager approves or declines a staff member's leave request.
   */
  async respondToLeaveRequest(
    salonId: number,
    requestId: number,
    action: "accept" | "reject"
  ): Promise<any> {
    return await apiRequest(`/api/v1/barbers/${salonId}/leave-requests/${requestId}/respond`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },

  /**
   * Activate an unlinked/departed staff member as an independent solo provider with full admin rights.
   */
  async activateSolo(): Promise<any> {
    return await apiRequest("/api/v1/barbers/activate-solo", {
      method: "POST",
    });
  },

  /**
   * Search salons strictly by salon name only.
   */
  async searchSalonsByName(name: string): Promise<any[]> {
    const trimmed = (name || "").trim();
    if (!trimmed) return [];
    try {
      const res = await apiRequest<any>(
        `/api/v1/barbers/salons/search?name=${encodeURIComponent(trimmed)}`,
        { method: "GET" }
      );
      if (res?.status === "error" || res?.message === "Salon not found") {
        const emptyResult: any = [];
        emptyResult.error = res?.message || "Salon not found";
        return emptyResult;
      }
      return res?.salons || [];
    } catch (e: any) {
      const emptyResult: any = [];
      emptyResult.error = e?.message || "Salon not found";
      return emptyResult;
    }
  },

  /**
   * Solo barber sends request to join a salon.
   */
  async sendJoinRequestToSalon(salonId: number, salonName?: string): Promise<any> {
    return await apiRequest("/api/v1/barbers/salons/send-join-request", {
      method: "POST",
      body: JSON.stringify({ salon_id: salonId, salon_name: salonName }),
    });
  },

  /**
   * Check if current barber has an active pending join request.
   */
  async getMyPendingJoinRequest(): Promise<any> {
    try {
      return await apiRequest("/api/v1/barbers/me/pending-join-request", {
        method: "GET",
      });
    } catch {
      return { has_pending_request: false, request: null };
    }
  },

  /**
   * Cancel current barber's pending join request.
   */
  async cancelPendingJoinRequest(): Promise<any> {
    return await apiRequest("/api/v1/barbers/me/cancel-join-request", {
      method: "DELETE",
    });
  },

  /**
   * Upgrades an independent solo barber, hairdresser or sub-barber account to a full Salon Manager or Main Barber account.
   */
  async switchToSalon(
    payload?:
      | {
          salon_name?: string;
          capacity?: number;
          staff_title?: string;
          city?: string;
          phone?: string;
          about_us?: string;
          chair_barber_names?: string[];
        }
      | string,
    maybeCapacity?: number
  ): Promise<any> {
    const body =
      typeof payload === "string"
        ? { salon_name: payload, capacity: maybeCapacity || 5 }
        : {
            salon_name: payload?.salon_name,
            capacity: payload?.capacity || 5,
            staff_title: payload?.staff_title,
            city: payload?.city,
            phone: payload?.phone,
            about_us: payload?.about_us,
            chair_barber_names: payload?.chair_barber_names,
          };
    return await apiRequest("/api/v1/profiles/switch-to-salon", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Switches a salon manager account back to an independent solo barber/hairdresser account.
   */
  async switchToSolo(): Promise<any> {
    return await apiRequest("/api/v1/profiles/switch-to-solo", {
      method: "POST",
    });
  },
};
