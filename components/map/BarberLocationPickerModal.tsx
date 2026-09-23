import { DEFAULT_MAP_REGION } from "@/constants/maps";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface BarberLocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmLocation: (location: {
    latitude: number;
    longitude: number;
    city?: string;
  }) => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialCity?: string;
}

function generatePickerWebMapHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #1C1E1B;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-container { background: #1C1E1B; }
    .picker-pin {
      width: 38px;
      height: 38px;
      border-radius: 19px;
      background: #A3B39C;
      border: 3px solid #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.6);
      cursor: grab;
      user-select: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var currentLat = ${lat};
    var currentLng = ${lng};
    var map = L.map('map', { zoomControl: false }).setView([currentLat, currentLng], 14);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(map);

    var pinIcon = L.divIcon({
      className: 'picker-div-icon',
      html: '<div class="picker-pin">✂️</div>',
      iconAnchor: [19, 19]
    });

    var marker = L.marker([currentLat, currentLng], { icon: pinIcon, draggable: true }).addTo(map);

    function notify(pos) {
      window.parent.postMessage({ type: 'PICK_COORDS', lat: pos.lat, lng: pos.lng }, '*');
    }

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      notify(e.latlng);
    });

    marker.on('dragend', function(e) {
      notify(marker.getLatLng());
    });

    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'SET_COORDS') {
        var pos = [event.data.lat, event.data.lng];
        marker.setLatLng(pos);
        map.setView(pos, 15, { animate: true });
      }
    });
  </script>
</body>
</html>`;
}

export default function BarberLocationPickerModal({
  visible,
  onClose,
  onConfirmLocation,
  initialLatitude,
  initialLongitude,
  initialCity = "Douala, Akwa",
}: BarberLocationPickerModalProps) {
  const colors = useColors();
  const mapRef = useRef<MapView>(null);
  const webIframeRef = useRef<any>(null);

  const [coordinate, setCoordinate] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: initialLatitude || DEFAULT_MAP_REGION.latitude,
    longitude: initialLongitude || DEFAULT_MAP_REGION.longitude,
  });

  const [region, setRegion] = useState<Region>({
    latitude: initialLatitude || DEFAULT_MAP_REGION.latitude,
    longitude: initialLongitude || DEFAULT_MAP_REGION.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const [locationName, setLocationName] = useState(initialCity);
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleMsg = (event: MessageEvent) => {
      try {
        if (event.data?.type === "PICK_COORDS") {
          setCoordinate({
            latitude: Number(event.data.lat),
            longitude: Number(event.data.lng),
          });
        }
      } catch {}
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, []);

  const handleMapPress = (e: any) => {
    const coords = e.nativeEvent.coordinate;
    if (coords) {
      setCoordinate(coords);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsFetchingGPS(true);
    try {
      // First check if permission is already granted (avoid repeated prompts)
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location access is required to use this feature. Please enable it in your device settings.",
          [{ text: "OK" }]
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;

      const newRegion: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      };

      setCoordinate({ latitude, longitude });
      setRegion(newRegion);

      if (Platform.OS === "web") {
        webIframeRef.current?.contentWindow?.postMessage(
          { type: "SET_COORDS", lat: latitude, lng: longitude },
          "*"
        );
      } else {
        // Animate the map camera to the GPS location
        mapRef.current?.animateToRegion(newRegion, 600);
      }

      // Reverse geocode to get a readable address
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          const parts = [geo.street, geo.district, geo.city, geo.region].filter(Boolean);
          setLocationName(parts.join(", ") || "Current GPS Location");
        } else {
          setLocationName("Current GPS Location");
        }
      } catch {
        setLocationName("Current GPS Location");
      }
    } catch (err) {
      console.warn("Location error:", err);
      Alert.alert(
        "Location Error",
        "Could not retrieve your current location. Please try selecting manually on the map."
      );
    } finally {
      setIsFetchingGPS(false);
    }
  };

  const handleSave = () => {
    onConfirmLocation({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      city: locationName,
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header Bar */}
        <View style={[styles.header, { borderBottomColor: colors.surfacevariant }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.primarytext} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
              Pinpoint Shop Location
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
              Tap on map or drag pin to your shop
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSave}
            style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.saveHeaderBtnText, { color: colors.background }]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Map View */}
        <View style={styles.mapContainer}>
          {Platform.OS === "web" ? (
            React.createElement("iframe", {
              ref: webIframeRef,
              srcDoc: generatePickerWebMapHtml(
                coordinate.latitude,
                coordinate.longitude
              ),
              style: {
                width: "100%",
                height: "100%",
                border: "none",
                backgroundColor: "#1C1E1B",
              },
              title: "Trimly Location Picker",
            })
          ) : (
            <MapView
              ref={mapRef}
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              mapType="satellite"
              style={styles.map}
              region={region}
              onRegionChangeComplete={(r) => setRegion(r)}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsCompass={true}
            >
              <Marker
                coordinate={coordinate}
                draggable
                onDragEnd={(e) => setCoordinate(e.nativeEvent.coordinate)}
              >
                <View style={styles.customPin}>
                  <View style={styles.pinBubble}>
                    <Ionicons name="cut" size={16} color="#1C1E1B" />
                  </View>
                  <View style={styles.pinArrow} />
                </View>
              </Marker>
            </MapView>
          )}

          {/* Quick GPS Floating Action */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={isFetchingGPS ? undefined : handleUseCurrentLocation}
            disabled={isFetchingGPS}
            style={[styles.gpsFloatingBtn, { backgroundColor: colors.surface, borderColor: colors.surfacevariant, opacity: isFetchingGPS ? 0.7 : 1 }]}
          >
            {isFetchingGPS ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="navigate-circle" size={22} color={colors.primary} />
            )}
            <Text style={[styles.gpsFloatingBtnText, { color: colors.primarytext }]}>
              {isFetchingGPS ? "Locating..." : "Use My Current GPS"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Coordinates & Confirmation Card */}
        <View style={[styles.bottomCard, { backgroundColor: colors.surface, borderTopColor: colors.surfacevariant }]}>
          <View style={styles.coordRow}>
            <View style={styles.coordBadge}>
              <Text style={styles.coordLabel}>LAT</Text>
              <Text style={[styles.coordValue, { color: colors.primarytext }]}>
                {coordinate.latitude.toFixed(6)}
              </Text>
            </View>

            <View style={styles.coordBadge}>
              <Text style={styles.coordLabel}>LNG</Text>
              <Text style={[styles.coordValue, { color: colors.primarytext }]}>
                {coordinate.longitude.toFixed(6)}
              </Text>
            </View>
          </View>

          <Text style={[styles.helperNotice, { color: colors.secondarytext }]}>
            📍 Clients near this location will see your shop on the Explore Map and can get driving directions directly to you.
          </Text>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSave}
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.background} />
            <Text style={[styles.confirmBtnText, { color: colors.background }]}>
              Confirm Shop Location
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  saveHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveHeaderBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...(StyleSheet.absoluteFill as any),
  },
  customPin: {
    alignItems: "center",
    justifyContent: "center",
  },
  pinBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#A3B39C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#A3B39C",
    marginTop: -1,
  },
  gpsFloatingBtn: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  gpsFloatingBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  bottomCard: {
    padding: 18,
    borderTopWidth: 1,
    gap: 12,
  },
  coordRow: {
    flexDirection: "row",
    gap: 12,
  },
  coordBadge: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 10,
    borderRadius: 10,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#A3B39C",
    letterSpacing: 1,
    marginBottom: 2,
  },
  coordValue: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  helperNotice: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
