import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as ExpoLocation from "expo-location";
import { AppState, AppStateStatus } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserCoords {
  lat: number;
  lon: number;
}

interface LocationContextValue {
  /** Human-readable city/district label, e.g. "Douala, Bonanjo" */
  locationLabel: string;
  /** Raw GPS coordinates (null until permission granted & fetched) */
  coords: UserCoords | null;
  /** Whether the initial location fetch is still in progress */
  isLocating: boolean;
  /** "granted" | "denied" | "undetermined" */
  permissionStatus: "granted" | "denied" | "undetermined";
  /** Call this to re-request permission and re-fetch location */
  refreshLocation: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LocationContext = createContext<LocationContextValue>({
  locationLabel: "Detecting location…",
  coords: null,
  isLocating: true,
  permissionStatus: "undetermined",
  refreshLocation: async () => {},
});

export const useLocation = () => useContext(LocationContext);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a clean city / district label from a geocoded address.
 * Falls back through several fields so we always have something readable.
 */
function buildLabel(geo: ExpoLocation.LocationGeocodedAddress | undefined): string {
  if (!geo) return "Your location";

  // Try district → subregion → city → region → country
  const parts: string[] = [];

  if (geo.district) parts.push(geo.district);
  else if (geo.subregion) parts.push(geo.subregion);
  else if (geo.city) parts.push(geo.city);

  if (geo.city && parts[0] !== geo.city) parts.push(geo.city);
  else if (!geo.city && geo.region) parts.push(geo.region);

  if (parts.length === 0 && geo.country) parts.push(geo.country);

  return parts.join(", ") || "Your location";
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [locationLabel, setLocationLabel] = useState("Detecting location…");
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");

  const isFetchingRef = useRef(false);

  const fetchLocation = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLocating(true);

    try {
      // 1. Request foreground permission
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      const granted = status === ExpoLocation.PermissionStatus.GRANTED;
      setPermissionStatus(granted ? "granted" : "denied");

      if (!granted) {
        setLocationLabel("Location unavailable");
        setIsLocating(false);
        isFetchingRef.current = false;
        return;
      }

      // 2. Get current position (balanced accuracy to avoid long waits)
      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      setCoords({ lat: latitude, lon: longitude });

      // 3. Reverse-geocode to get a human-readable address
      try {
        const [geo] = await ExpoLocation.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        setLocationLabel(buildLabel(geo));
      } catch {
        // Geocoding failed — show coordinates as fallback
        setLocationLabel(`${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`);
      }
    } catch (err) {
      setLocationLabel("Location unavailable");
    } finally {
      setIsLocating(false);
      isFetchingRef.current = false;
    }
  }, []);

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // ── Re-fetch when app comes back to foreground ──────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          // Only re-fetch if we already have permission (avoid showing the
          // dialog again on every foreground event)
          if (permissionStatus === "granted") {
            fetchLocation();
          }
        }
      }
    );
    return () => subscription.remove();
  }, [fetchLocation, permissionStatus]);

  return (
    <LocationContext.Provider
      value={{
        locationLabel,
        coords,
        isLocating,
        permissionStatus,
        refreshLocation: fetchLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}
