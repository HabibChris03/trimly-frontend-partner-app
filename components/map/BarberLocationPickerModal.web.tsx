import { useLanguage } from "@/context/LanguageContext";
import { DEFAULT_MAP_REGION } from "@/constants/maps";
import { FontFamily } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

function generatePickerWebMapHtml(lat: number, lng: number, isDark: boolean) {
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const bgColor = isDark ? "#171918" : "#F5F5F2";

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
      background: ${bgColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-container { background: ${bgColor}; }
    .picker-pin {
      width: 40px;
      height: 40px;
      border-radius: 20px;
      background: #C7F36B;
      border: 2.5px solid #171918;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.45);
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

    L.tileLayer('${tileUrl}', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    var pinIcon = L.divIcon({
      className: 'picker-div-icon',
      html: '<div class="picker-pin"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#171918" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg></div>',
      iconAnchor: [20, 20]
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
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const webIframeRef = useRef<any>(null);

  const [coordinate, setCoordinate] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: initialLatitude || DEFAULT_MAP_REGION.latitude,
    longitude: initialLongitude || DEFAULT_MAP_REGION.longitude,
  });

  const [locationName, setLocationName] = useState(initialCity);
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);

  useEffect(() => {
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

  const handleUseCurrentLocation = async () => {
    setIsFetchingGPS(true);
    try {
      const { status: existingStatus } =
        await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location access is required to use this feature. Please enable it in your browser settings.",
          [{ text: "OK" }]
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;

      setCoordinate({ latitude, longitude });

      webIframeRef.current?.contentWindow?.postMessage(
        { type: "SET_COORDS", lat: latitude, lng: longitude },
        "*"
      );

      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (geo) {
          const parts = [
            geo.street,
            geo.district,
            geo.city,
            geo.region,
          ].filter(Boolean);
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
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header Bar */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onClose}
            style={[
              styles.headerBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="close" size={20} color={colors.primarytext} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.primarytext }]}>{language === "fr" ? "Localiser l'emplacement du salon" : "Pinpoint Shop Location"}</Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.secondarytext }]}
            >
              {t("booking.tapOnMapOrDragPin") || "Tap on map or drag pin to your shop"}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]}
          >
            <Text
              style={[styles.saveHeaderBtnText, { color: colors.onBrand }]}
            >{language === "fr" ? "Enregistrer" : "Save"}</Text>
          </TouchableOpacity>
        </View>

        {/* Map View */}
        <View style={styles.mapContainer}>
          {React.createElement("iframe", {
            ref: webIframeRef,
            srcDoc: generatePickerWebMapHtml(
              coordinate.latitude,
              coordinate.longitude,
              isDark
            ),
            style: {
              width: "100%",
              height: "100%",
              border: "none",
              backgroundColor: isDark ? "#171918" : "#F5F5F2",
            },
            title: "Trimly Location Picker",
          })}

          {/* Quick GPS Floating Action */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={isFetchingGPS ? undefined : handleUseCurrentLocation}
            disabled={isFetchingGPS}
            style={[
              styles.gpsFloatingBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: isFetchingGPS ? 0.7 : 1,
              },
            ]}
          >
            {isFetchingGPS ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="navigate-circle"
                size={21}
                color={colors.primary}
              />
            )}
            <Text
              style={[styles.gpsFloatingBtnText, { color: colors.primarytext }]}
            >
              {isFetchingGPS ? "Locating..." : "Use My Current GPS"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Coordinates & Confirmation Card */}
        <View
          style={[
            styles.bottomCard,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <View style={styles.coordRow}>
            <View
              style={[
                styles.coordBadge,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.coordLabel, { color: colors.primary }]}>
                LAT
              </Text>
              <Text style={[styles.coordValue, { color: colors.primarytext }]}>
                {coordinate.latitude.toFixed(6)}
              </Text>
            </View>

            <View
              style={[
                styles.coordBadge,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.coordLabel, { color: colors.primary }]}>
                LNG
              </Text>
              <Text style={[styles.coordValue, { color: colors.primarytext }]}>
                {coordinate.longitude.toFixed(6)}
              </Text>
            </View>
          </View>

          <Text style={[styles.helperNotice, { color: colors.secondarytext }]}>
            {t("booking.shopMapExploreDesc") || "Clients near this location will see your shop on the Explore Map and can get driving directions directly to you."}
          </Text>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSave}
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.onBrand}
            />
            <Text style={[styles.confirmBtnText, { color: colors.onBrand }]}>
              {t("booking.confirmShopLocation") || "Confirm Shop Location"}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  saveHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 11,
  },
  saveHeaderBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
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
    borderRadius: 14,
    borderWidth: 1,
  },
  gpsFloatingBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.semibold,
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
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  coordLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 3,
  },
  coordValue: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  helperNotice: {
    fontSize: 12.5,
    fontFamily: FontFamily.regular,
    lineHeight: 18,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
});

