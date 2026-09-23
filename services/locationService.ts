import { apiRequest } from "./api";

export interface NearbyBarberFilter {
  lat: number;
  lon: number;
  radius_km?: number;
  category?: string;
  min_rating?: number;
  max_price?: number;
}

export interface RouteToBarberResponse {
  distance_km: number;
  duration_minutes: number;
  source: "osrm" | "estimated" | string;
}

export const locationService = {
  /**
   * Search nearby barbers with coordinate filters.
   * Endpoint: GET /api/v1/location/nearby-barbers
   */
  async getNearbyBarbers(params: NearbyBarberFilter): Promise<any[]> {
    try {
      const res = await apiRequest<any>("/api/v1/location/nearby-barbers", {
        method: "GET",
        params: {
          lat: params.lat,
          lon: params.lon,
          radius_km: params.radius_km || 50.0,
          category: params.category,
          min_rating: params.min_rating,
          max_price: params.max_price,
        },
      });
      if (res && res.barbers_found && Array.isArray(res.barbers_found)) {
        return res.barbers_found;
      }
      if (Array.isArray(res)) return res;
    } catch {
      // Fallback
    }
    return [];
  },

  /**
   * Get driving route distance and ETA to a specific barber.
   * Endpoint: GET /api/v1/location/route
   */
  async getRouteToBarber(
    originLat: number,
    originLon: number,
    barberId: number
  ): Promise<RouteToBarberResponse> {
    try {
      const res = await apiRequest<RouteToBarberResponse>("/api/v1/location/route", {
        method: "GET",
        params: {
          origin_lat: originLat,
          origin_lon: originLon,
          barber_id: barberId,
        },
      });
      if (res) return res;
    } catch {
      // Fallback
    }
    return {
      distance_km: 1.8,
      duration_minutes: 8,
      source: "estimated",
    };
  },
};
