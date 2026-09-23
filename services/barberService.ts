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
}

export interface PortfolioItemUpload {
  media_url: string;
  media_type: "image" | "video" | string;
  hairstyle_or_service_name: string;
  linked_service_id?: number | null;
}

export interface ProfileUpdateInput {
  name?: string | null;
  logo_url?: string | null;
  about_us?: string | null;
  phone?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface BarberCapacityUpdate {
  bio?: string | null;
  is_salon?: boolean | null;
  capacity?: number | null;
}

// In-memory / shared storage for barber services so newly added services cache cleanly
const sharedBarberServices: Record<number, BarberServiceItem[]> = {};

// Shared stores for salon invites and dynamic staff affiliations
const salonInvites: any[] = [];
const salonActiveStaff: any[] = [];
const clientSalonAffiliations: Record<string, string> = {};

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
   * Search registered Trimly clients directly from the database to invite as salon staff.
   */
  async searchClients(query?: string): Promise<Array<{ id: number; name: string; email: string; phone?: string; role?: string }>> {
    const q = (query || "").trim();

    try {
      // Primary: Fetch live registered clients from database endpoint
      const res = await apiRequest<any>(`/api/v1/barbers/clients/search`, {
        method: "GET",
        params: q ? { q } : undefined,
      });

      let clients: any[] = [];
      if (res?.clients && Array.isArray(res.clients)) {
        clients = res.clients;
      } else if (Array.isArray(res)) {
        clients = res;
      } else if (res?.users && Array.isArray(res.users)) {
        clients = res.users;
      }

      if (clients.length > 0) {
        return clients.map((c) => ({
          id: c.id,
          name: c.name || (c.email ? c.email.split("@")[0].charAt(0).toUpperCase() + c.email.split("@")[0].slice(1) : "Client"),
          email: c.email,
          phone: c.phone || undefined,
          role: c.role || "client",
        }));
      }
    } catch {
      // Try secondary user search endpoint
      try {
        const res = await apiRequest<any>(`/api/v1/users/search`, {
          method: "GET",
          params: q ? { q } : undefined,
        });
        if (res?.clients && Array.isArray(res.clients)) return res.clients;
        if (Array.isArray(res) && res.length > 0) return res;
        if (res?.users && Array.isArray(res.users)) return res.users;
      } catch {
        // Handled below
      }
    }

    return [];
  },

  /**
   * Cancel / revoke a staff invite from the database and persistent storage.
   */
  async cancelStaffInvite(
    salonIdOrInviteId: number | string,
    optionalInviteId?: string | number
  ): Promise<boolean> {
    let salonId = 4;
    let inviteId: string | number;

    if (optionalInviteId !== undefined) {
      salonId = Number(salonIdOrInviteId) || 4;
      inviteId = optionalInviteId;
    } else {
      inviteId = salonIdOrInviteId;
    }

    try {
      await apiRequest(`/api/v1/barbers/${salonId}/invites/${inviteId}`, {
        method: "DELETE",
      });
    } catch {
      // Fallback
    }

    const idx = salonInvites.findIndex((i) => String(i.id) === String(inviteId));
    if (idx !== -1) {
      salonInvites.splice(idx, 1);
    }

    // Update persistent salon storage
    const storageKey = `@trimly_salon_invites_${salonId}`;
    const persisted = await getStoredData<any[]>(storageKey, []);
    const updated = persisted.filter((i) => String(i.id) !== String(inviteId));
    await setStoredData(storageKey, updated);

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
    let dbInvite: any = null;

    // 1. Attempt POST to dedicated /invites route
    try {
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
      if (res && res.invite) {
        dbInvite = res.invite;
      }
    } catch {
      // 2. Fallback to /staff route if /invites is not deployed yet and status is pending
      if (inviteStatus === "pending") {
        try {
          const staffRes = await apiRequest<any>(`/api/v1/barbers/${payload.salonId}/staff`, {
            method: "POST",
            body: JSON.stringify({
              name: payload.client.name,
              email: payload.client.email,
              phone: payload.client.phone,
              role: payload.role,
            }),
          });
          if (staffRes?.staff_member) {
            dbInvite = {
              id: staffRes.staff_member.id,
              created_at: new Date().toISOString(),
            };
          }
        } catch {
          // Handled locally
        }
      }
    }

    const invite = {
      id: dbInvite ? dbInvite.id : `inv_${Date.now()}`,
      salonId: payload.salonId,
      salonName: payload.salonName,
      clientId: payload.client.id,
      clientName: payload.client.name,
      clientEmail: payload.client.email,
      clientPhone: payload.client.phone,
      role: payload.role,
      status: inviteStatus === "still_to_send" ? "Still To Send" : "Pending",
      rawStatus: inviteStatus,
      createdAt: dbInvite?.created_at || new Date().toISOString(),
    };

    // Update memory
    const existingIdx = salonInvites.findIndex(
      (i) => i.clientEmail?.toLowerCase() === payload.client.email.toLowerCase() && i.salonId === payload.salonId
    );
    if (existingIdx >= 0) {
      salonInvites[existingIdx] = invite;
    } else {
      salonInvites.push(invite);
    }

    // Persist to SecureStore / localStorage for salon
    const storageKey = `@trimly_salon_invites_${payload.salonId}`;
    const persisted = await getStoredData<any[]>(storageKey, []);
    const pIdx = persisted.findIndex((i) => i.clientEmail?.toLowerCase() === payload.client.email.toLowerCase());
    if (pIdx >= 0) {
      persisted[pIdx] = invite;
    } else {
      persisted.unshift(invite);
    }
    await setStoredData(storageKey, persisted);

    // Also persist under client's pending invites key for cross-device/offline testing
    if (payload.client.email) {
      const clientKey = `@trimly_client_invites_${payload.client.email.trim().toLowerCase()}`;
      const clientPersisted = await getStoredData<any[]>(clientKey, []);
      const cIdx = clientPersisted.findIndex((i) => i.salonId === payload.salonId);
      if (cIdx >= 0) {
        clientPersisted[cIdx] = invite;
      } else {
        clientPersisted.unshift(invite);
      }
      await setStoredData(clientKey, clientPersisted);
    }

    return invite;
  },

  /**
   * Update invitation status in the database (e.g. promoting 'still_to_send' draft to 'pending').
   */
  async updateStaffInviteStatus(salonId: number, inviteId: string | number, status: string): Promise<any> {
    try {
      await apiRequest(`/api/v1/barbers/${salonId}/invites/${inviteId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch {
      // Local fallback
    }

    const nextStatus = status === "still_to_send" ? "Still To Send" : status === "pending" ? "Pending" : "Active";
    const item = salonInvites.find((i) => String(i.id) === String(inviteId));
    if (item) {
      item.status = nextStatus;
      item.rawStatus = status;
    }

    const storageKey = `@trimly_salon_invites_${salonId}`;
    const persisted = await getStoredData<any[]>(storageKey, []);
    const pItem = persisted.find((i) => String(i.id) === String(inviteId));
    if (pItem) {
      pItem.status = nextStatus;
      pItem.rawStatus = status;
      await setStoredData(storageKey, persisted);
    }

    return true;
  },

  /**
   * Get pending invites sent to a specific client.
   * Queries the live backend database (GET /api/v1/barbers/my-invitations),
   * falls back to the in-app notification feed, and merges with local persistent storage.
   */
  async getPendingInvitesForClient(clientEmailOrName?: string): Promise<any[]> {
    if (!clientEmailOrName) return [];
    const query = clientEmailOrName.trim().toLowerCase();
    const invitesMap = new Map<string, any>();

    // 1. Fetch from server endpoint GET /api/v1/barbers/my-invitations
    try {
      const res = await apiRequest<any>("/api/v1/barbers/my-invitations", { method: "GET" });
      if (res && Array.isArray(res.invites)) {
        res.invites.forEach((inv: any) => {
          invitesMap.set(`srv_${inv.id}`, {
            id: inv.id,
            salonId: inv.salon_id,
            salonName: inv.salon_name || `Salon #${inv.salon_id}`,
            salonLogo: inv.salon_logo || null,
            salonCity: inv.salon_city || null,
            role: inv.role || "Barber",
            status: "Pending",
            rawStatus: "pending",
            createdAt: inv.created_at || new Date().toISOString(),
          });
        });
      }
    } catch {
      // Server endpoint not reachable or older build
    }

    // 2. Query in-app notifications feed for any staff_invite items
    try {
      const notifs = await apiRequest<any>("/api/v1/notifications/", { method: "GET" });
      const list = Array.isArray(notifs?.notifications) ? notifs.notifications : Array.isArray(notifs) ? notifs : [];
      list
        .filter((n: any) => n.type === "staff_invite" && !n.is_read && !n.read)
        .forEach((n: any) => {
          let sId = 4;
          if (n.action_route && n.action_route.includes("/accept-salon-invite/")) {
            const parts = n.action_route.split("/accept-salon-invite/");
            if (parts[1]) sId = parseInt(parts[1], 10) || 4;
          }
          let sName = "Salon";
          if (n.title && n.title.includes("from ")) {
            sName = n.title.split("from ")[1] || "Salon";
          }
          const key = `notif_${sId}`;
          if (!invitesMap.has(key)) {
            invitesMap.set(key, {
              id: `notif_inv_${n.id || sId}`,
              salonId: sId,
              salonName: sName,
              role: "Barber",
              status: "Pending",
              rawStatus: "pending",
              createdAt: n.created_at || new Date().toISOString(),
            });
          }
        });
    } catch {
      // Notifications query failed
    }

    // 3. Query persistent storage for cached client invites
    const clientKey = `@trimly_client_invites_${query}`;
    const persisted = await getStoredData<any[]>(clientKey, []);
    persisted
      .filter((inv) => inv.status === "Pending" || inv.status === "pending" || inv.rawStatus === "pending")
      .forEach((inv) => {
        const key = `pers_${inv.salonId}_${inv.id}`;
        if (!invitesMap.has(key)) {
          invitesMap.set(key, inv);
        }
      });

    // 4. Also check in-memory salonInvites
    salonInvites
      .filter(
        (inv) =>
          (inv.status === "Pending" || inv.status === "pending" || inv.rawStatus === "pending") &&
          (inv.clientEmail?.toLowerCase() === query || inv.clientName?.toLowerCase() === query)
      )
      .forEach((inv) => {
        const key = `mem_${inv.salonId}_${inv.id}`;
        if (!invitesMap.has(key)) {
          invitesMap.set(key, inv);
        }
      });

    return Array.from(invitesMap.values());
  },

  /**
   * Accept or decline a salon invitation.
   */
  async respondToStaffInvite(
    inviteId: string | number,
    accept: boolean,
    optionalSalonId?: number
  ): Promise<{ success: boolean; salonName?: string }> {
    let invite = salonInvites.find((i) => String(i.id) === String(inviteId));
    let targetSalonId = optionalSalonId || (invite ? invite.salonId : 4);

    if (accept) {
      try {
        await apiRequest(`/api/v1/barbers/accept-salon-invite/${targetSalonId}`, {
          method: "POST",
        });
      } catch {
        // Handled locally
      }
    } else {
      try {
        await apiRequest(`/api/v1/barbers/decline-salon-invite/${targetSalonId}`, {
          method: "POST",
        });
      } catch {
        // Handled locally
      }
    }

    if (invite) {
      invite.status = accept ? "Active" : "Declined";
      invite.rawStatus = accept ? "active" : "declined";
    }

    // Remove or update from persisted client invites
    if (invite?.clientEmail) {
      const clientKey = `@trimly_client_invites_${invite.clientEmail.trim().toLowerCase()}`;
      const clientPersisted = await getStoredData<any[]>(clientKey, []);
      const updated = clientPersisted.filter((i) => String(i.id) !== String(inviteId) && i.salonId !== targetSalonId);
      await setStoredData(clientKey, updated);
    }

    // Update salon persistent invites
    const storageKey = `@trimly_salon_invites_${targetSalonId}`;
    const persisted = await getStoredData<any[]>(storageKey, []);
    const pItem = persisted.find((i) => String(i.id) === String(inviteId));
    if (pItem) {
      pItem.status = accept ? "Active" : "Declined";
      pItem.rawStatus = accept ? "active" : "declined";
      await setStoredData(storageKey, persisted);
    }

    const salonName = invite?.salonName || `Salon #${targetSalonId}`;

    if (accept && invite) {
      salonActiveStaff.push({
        id: invite.clientId,
        name: invite.clientName,
        email: invite.clientEmail,
        phone: invite.clientPhone,
        role: invite.role || "Barber",
        salonId: targetSalonId,
        salonName,
        status: "Active",
      });

      if (invite.clientEmail) {
        clientSalonAffiliations[invite.clientEmail.toLowerCase()] = salonName;
      }
      if (invite.clientName) {
        clientSalonAffiliations[invite.clientName.toLowerCase()] = salonName;
      }
    }

    return { success: true, salonName };
  },

  /**
   * Check if a client belongs to a salon (for "{Salon Name} Barber" badge).
   */
  getClientSalonAffiliation(clientEmailOrName?: string): string | null {
    if (!clientEmailOrName) return null;
    return clientSalonAffiliations[clientEmailOrName.toLowerCase()] || null;
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
    try {
      await apiRequest(`/api/v1/barbers/${salonId}/staff/${staffId}`, {
        method: "DELETE",
      });
    } catch {
      // Handled in store
    }
    const idx = salonActiveStaff.findIndex((s) => s.id === staffId && s.salonId === salonId);
    if (idx !== -1) {
      salonActiveStaff.splice(idx, 1);
    }
    return { status: "success" };
  },

  /**
   * Fetch current salon/barber working chairs and capacity from database.
   */
  async getSalonCapacity(
    salonId: number
  ): Promise<{ capacity: number; is_salon: boolean; working_chairs: number }> {
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
  async listSalonStaff(salonId: number): Promise<any[]> {
    try {
      const res = await apiRequest(`/api/v1/barbers/${salonId}/staff`, {
        method: "GET",
      });
      if (Array.isArray(res) && res.length > 0) {
        return res;
      }
      if (Array.isArray(res?.staff) && res.staff.length > 0) {
        return res.staff;
      }
    } catch {
      // Fall back to active staff store
    }

    return salonActiveStaff.filter((s) => s.salonId === salonId);
  },

  /**
   * List all invites stored in the database for this salon (active, pending, still_to_send).
   * Pre-populates immediately from persistent storage so drafts and pending invites never disappear.
   */
  async listSalonInvites(salonId: number, status?: string): Promise<any[]> {
    const storageKey = `@trimly_salon_invites_${salonId}`;
    const persisted = await getStoredData<any[]>(storageKey, []);

    // Seed in-memory cache with persisted invites so nothing is lost
    persisted.forEach((p) => {
      const idx = salonInvites.findIndex((i) => String(i.id) === String(p.id));
      if (idx >= 0) salonInvites[idx] = p;
      else salonInvites.push(p);
    });

    try {
      const url = status
        ? `/api/v1/barbers/${salonId}/invites?status=${status}`
        : `/api/v1/barbers/${salonId}/invites`;
      const res = await apiRequest<any>(url, { method: "GET" });
      if (res && Array.isArray(res.invites)) {
        const mapped = res.invites.map((inv: any) => ({
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
          createdAt: inv.created_at || new Date().toISOString(),
        }));

        // Preserve local drafts (still_to_send) that might not be on server
        const localDrafts = persisted.filter(
          (p) =>
            (p.rawStatus === "still_to_send" || p.status === "Still To Send") &&
            !mapped.some((m: any) => String(m.id) === String(p.id))
        );
        const combined = [...mapped, ...localDrafts];

        // Save back to persistent storage
        await setStoredData(storageKey, combined);

        combined.forEach((item: any) => {
          const idx = salonInvites.findIndex((i) => String(i.id) === String(item.id));
          if (idx >= 0) salonInvites[idx] = item;
          else salonInvites.push(item);
        });

        return status
          ? combined.filter((i) => i.rawStatus === status || i.status.toLowerCase() === status.toLowerCase())
          : combined;
      }
    } catch {
      // If server /invites 404s (e.g. before VPS redeploy), fallback to /staff merged with persistent
      try {
        const staffRes = await apiRequest<any>(`/api/v1/barbers/${salonId}/staff`, { method: "GET" });
        const staffList = Array.isArray(staffRes?.staff) ? staffRes.staff : Array.isArray(staffRes) ? staffRes : [];
        if (staffList.length > 0) {
          staffList.forEach((s: any) => {
            if (!persisted.some((p) => p.clientEmail?.toLowerCase() === s.email?.toLowerCase())) {
              persisted.push({
                id: s.id,
                salonId,
                salonName: `Salon #${salonId}`,
                clientId: s.id,
                clientName: s.name || s.email,
                clientEmail: s.email,
                clientPhone: s.phone,
                role: s.role || "Barber",
                status: s.status === "Active" ? "Active" : "Pending",
                rawStatus: s.status === "Active" ? "active" : "pending",
                createdAt: new Date().toISOString(),
              });
            }
          });
        }
      } catch {
        // Fall through
      }
    }

    // Return persisted invites for this salon
    const results = salonInvites.filter((inv) => inv.salonId === salonId);
    if (status) {
      return results.filter((i) => i.rawStatus === status || i.status.toLowerCase() === status.toLowerCase());
    }
    return results;
  },

  /**
   * Update staff member status (Active, Off Duty, On Break).
   */
  async updateStaffStatus(
    salonId: number,
    staffId: number,
    status: "Active" | "Off Duty" | "On Break"
  ): Promise<any> {
    try {
      await apiRequest(`/api/v1/barbers/${salonId}/staff/${staffId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch {
      // Local fallback
    }

    const staff = salonActiveStaff.find((s) => s.id === staffId && s.salonId === salonId);
    if (staff) {
      staff.status = status;
    }
    return { status: "success" };
  },

  /**
   * Get earnings & appointment summary for the logged-in barber/salon.
   * Endpoint: GET /api/v1/barbers/earnings/summary?period=today|week|month|all_time
   */
  async getEarningsSummary(
    period: "today" | "week" | "month" | "all_time" = "week"
  ): Promise<any> {
    try {
      return await apiRequest("/api/v1/barbers/earnings/summary", {
        method: "GET",
        params: { period },
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
   * Toggle auto-confirmation of new booking requests.
   */
  async toggleAutoConfirm(autoConfirm: boolean): Promise<any> {
    return await apiRequest("/api/v1/barbers/auto-confirm", {
      method: "PATCH",
      body: JSON.stringify({ auto_confirm: autoConfirm }),
    });
  },
};
