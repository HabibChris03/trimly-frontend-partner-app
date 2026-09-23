import { apiRequest } from "./api";

export interface FavoriteBarberItem {
  id: number | string;
  barber_id: number;
  name: string;
  bio?: string;
  rating?: number | string;
  distance_km?: number;
  starting_price?: number;
  logo_url?: string;
}

export const favoriteService = {
  /**
   * Save a barber to current client's favorites.
   * Endpoint: POST /api/v1/favorites/{barber_id}
   */
  async saveFavorite(barberId: number): Promise<any> {
    return apiRequest(`/api/v1/favorites/${barberId}`, {
      method: "POST",
    });
  },

  /**
   * Remove a barber from current client's favorites.
   * Endpoint: DELETE /api/v1/favorites/{barber_id}
   */
  async removeFavorite(barberId: number): Promise<any> {
    return apiRequest(`/api/v1/favorites/${barberId}`, {
      method: "DELETE",
    });
  },

  /**
   * List all saved favorite barbers for the logged-in client.
   * Endpoint: GET /api/v1/favorites/
   */
  async listFavorites(): Promise<FavoriteBarberItem[]> {
    try {
      const res = await apiRequest<any[]>("/api/v1/favorites/", {
        method: "GET",
      });
      if (Array.isArray(res)) {
        return res.map((f: any, idx: number) => ({
          id: f.barber_id || f.id || idx + 1,
          barber_id: f.barber_id || f.id || idx + 1,
          name: f.name || "Master Barber",
          bio: f.bio || f.about_us || "Master Barber & Stylist",
          rating: f.rating !== undefined && f.rating !== null ? Number(f.rating).toFixed(1) : "0.0",
          distance_km: f.distance_km !== undefined && f.distance_km !== null ? Number(f.distance_km) : undefined,
          starting_price: f.starting_price || 0,
          logo_url: f.logo_url,
        }));
      }
    } catch {
      // Empty if database query fails
    }

    return [];
  },
};
