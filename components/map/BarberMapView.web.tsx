import { DEFAULT_MAP_REGION } from "@/constants/maps";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { barberService } from "@/services/barberService";
import { useThemeImages } from "@/hooks/useThemeImages";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface BarberLocationItem {
  id: string | number;
  name: string;
  brand: string;
  rating: string | number;
  amount: string | number;
  distance: string;
  latitude: number;
  longitude: number;
  avatar: any;
}

interface BarberMapViewProps {
  onSelectBarber?: (barber: BarberLocationItem) => void;
  style?: object;
}

function generateWebMapHtml(
  barbers: BarberLocationItem[],
  selectedId: string | number | null,
  isDark: boolean
) {
  const barbersData = barbers.map((b) => ({
    id: String(b.id),
    name: b.name,
    rating: b.rating,
    lat: b.latitude,
    lng: b.longitude,
    amount: b.amount,
    isSelected: String(b.id) === String(selectedId),
  }));

  const centerLat =
    barbers.length > 0 ? barbers[0].latitude : DEFAULT_MAP_REGION.latitude;
  const centerLng =
    barbers.length > 0 ? barbers[0].longitude : DEFAULT_MAP_REGION.longitude;

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const bgColor = isDark ? "#171918" : "#F5F5F2";
  const pinBg = isDark ? "#252926" : "#FFFFFF";
  const pinBorder = isDark ? "#383D38" : "#DCDDD9";
  const pinText = isDark ? "#FFFFFF" : "#171918";
  const pinShadow = isDark
    ? "rgba(0,0,0,0.5)"
    : "rgba(0,0,0,0.15)";

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
      overflow: hidden;
    }
    .leaflet-container { background: ${bgColor}; }
    .barber-pin {
      background: ${pinBg};
      border: 1.5px solid ${pinBorder};
      border-radius: 20px;
      padding: 5px 10px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: ${pinText};
      font-size: 11.5px;
      font-weight: 700;
      box-shadow: 0 3px 12px ${pinShadow};
      cursor: pointer;
      white-space: nowrap;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .barber-pin:hover {
      transform: scale(1.08);
      border-color: #C7F36B;
    }
    .barber-pin.selected {
      background: #C7F36B;
      color: #171918;
      border-color: #171918;
      transform: scale(1.12);
      box-shadow: 0 6px 18px rgba(199, 243, 107,0.35);
    }
    .barber-pin .star {
      color: #C7F36B;
      font-size: 11px;
    }
    .barber-pin.selected .star {
      color: #171918;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var barbers = ${JSON.stringify(barbersData)};
    var defaultCenter = [${centerLat}, ${centerLng}];
    var map = L.map('map', { zoomControl: false }).setView(defaultCenter, 13);

    L.tileLayer('${tileUrl}', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    barbers.forEach(function(b) {
      var isSel = b.isSelected;
      var firstName = b.name.split(' ')[0] || b.name;
      var icon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: '<div class="barber-pin ' + (isSel ? 'selected' : '') + '">' +
              '<svg class="star" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
              '<span>' + b.rating + '</span> - <span>' + firstName + '</span>' +
              '</div>',
        iconAnchor: [40, 20]
      });

      var marker = L.marker([b.lat, b.lng], { icon: icon }).addTo(map);

      marker.on('click', function() {
        window.parent.postMessage({ type: 'SELECT_BARBER', barberId: b.id }, '*');
      });
    });

    window.addEventListener('message', function(event) {
      if (!event.data) return;
      if (event.data.type === 'RECENTER') {
        map.setView(defaultCenter, 13, { animate: true });
      } else if (event.data.type === 'PAN_TO') {
        map.panTo([event.data.lat, event.data.lng], { animate: true });
      }
    });
  </script>
</body>
</html>`;
}

export default function BarberMapView({
  onSelectBarber,
  style,
}: BarberMapViewProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const webIframeRef = useRef<any>(null);
  const themeImages = useThemeImages();
  const profilePic = themeImages.profilePic;

  const [barbersList, setBarbersList] = useState<BarberLocationItem[]>([]);
  const [selectedBarber, setSelectedBarber] =
    useState<BarberLocationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadNearby() {
      try {
        setIsLoading(true);
        const apiBarbers = await barberService.getNearbyBarbers(
          DEFAULT_MAP_REGION.latitude,
          DEFAULT_MAP_REGION.longitude,
          50000.0
        );

        if (Array.isArray(apiBarbers) && apiBarbers.length > 0) {
          const mapped: BarberLocationItem[] = apiBarbers.map((b, idx) => ({
            id: b.id || `api-${idx}`,
            name: b.name || "Barber & Stylist",
            brand: b.bio || b.about_us || "Professional Grooming",
            rating: b.rating !== undefined && b.rating !== null ? Number(b.rating).toFixed(1) : "0.0",
            amount: b.starting_price || 0,
            distance: b.distance_km ? `${b.distance_km.toFixed(1)} km` : "Nearby",
            latitude: b.latitude || DEFAULT_MAP_REGION.latitude + (idx * 0.003),
            longitude: b.longitude || DEFAULT_MAP_REGION.longitude + (idx * 0.003),
            avatar: b.logo_url ? { uri: b.logo_url } : profilePic,
          }));
          setBarbersList(mapped);
          if (mapped.length > 0) {
            setSelectedBarber(mapped[0]);
          }
        } else {
          setBarbersList([]);
          setSelectedBarber(null);
        }
      } catch {
        setBarbersList([]);
        setSelectedBarber(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadNearby();
  }, [profilePic]);

  useEffect(() => {
    const handleMsg = (event: MessageEvent) => {
      try {
        if (event.data?.type === "SELECT_BARBER") {
          const found = barbersList.find(
            (b) => String(b.id) === String(event.data.barberId)
          );
          if (found) {
            setSelectedBarber(found);
            if (onSelectBarber) onSelectBarber(found);
          }
        }
      } catch {}
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [barbersList, onSelectBarber]);

  const handleRecenter = () => {
    webIframeRef.current?.contentWindow?.postMessage({ type: "RECENTER" }, "*");
  };

  const handleGetDirections = (barber: BarberLocationItem) => {
    const lat = barber.latitude;
    const lng = barber.longitude;
    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(fallbackUrl, "_blank");
  };

  const handleOpenProfile = () => {
    if (!selectedBarber) return;
    router.push({
      pathname: "/Pages/barbersprofile" as any,
      params: {
        id: selectedBarber.id.toString(),
        name: selectedBarber.name,
        brand: selectedBarber.brand,
        kilometers: selectedBarber.distance.replace(/[^0-9.]/g, ""),
        amount: selectedBarber.amount.toString(),
        rating: selectedBarber.rating.toString(),
      },
    });
  };

  return (
    <View style={[styles.container, style]}>
      {React.createElement("iframe", {
        ref: webIframeRef,
        srcDoc: generateWebMapHtml(barbersList, selectedBarber?.id || null, isDark),
        style: {
          width: "100%",
          height: "100%",
          border: "none",
          backgroundColor: isDark ? "#171918" : "#F5F5F2",
        },
        title: "Trimly Barber Map",
      })}

      {/* Floating Recenter Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleRecenter}
        style={[
          styles.recenterButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="locate" size={22} color={colors.primary} />
      </TouchableOpacity>

      {/* Floating Barber Detail Card at Bottom */}
      {isLoading ? (
        <View
          style={[
            styles.selectedCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Skeleton width={50} height={50} borderRadius={14} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Skeleton width="60%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="80%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={12} borderRadius={4} />
          </View>
        </View>
      ) : selectedBarber ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleOpenProfile}
          style={[
            styles.selectedCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Image source={selectedBarber.avatar} style={styles.cardAvatar} />

          <View style={styles.cardInfo}>
            <View style={styles.cardHeaderRow}>
              <Text
                style={[styles.cardName, { color: colors.primarytext }]}
                numberOfLines={1}
              >
                {selectedBarber.name}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={colors.star} />
                <Text
                  style={[styles.cardRating, { color: colors.primarytext }]}
                >
                  {selectedBarber.rating}
                </Text>
              </View>
            </View>

            <Text
              style={[styles.cardBrand, { color: colors.secondarytext }]}
              numberOfLines={1}
            >
              {selectedBarber.brand}
            </Text>

            <View style={styles.cardMetaRow}>
              <View style={styles.metaTag}>
                <Ionicons
                  name="location-outline"
                  size={12}
                  color={colors.secondarytext}
                />
                <Text
                  style={[styles.metaText, { color: colors.secondarytext }]}
                >
                  {selectedBarber.distance}
                </Text>
              </View>

              <View style={styles.metaDot} />

              <View style={styles.metaTag}>
                <Ionicons
                  name="pricetag-outline"
                  size={12}
                  color={colors.primary}
                />
                <Text
                  style={[styles.metaText, { color: colors.primary, fontWeight: "700" }]}
                >
                  From {selectedBarber.amount} XAF
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardActionsCol}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleGetDirections(selectedBarber)}
              style={[styles.directionsBtn, { backgroundColor: colors.surfacevariant }]}
            >
              <Ionicons name="navigate" size={14} color={colors.primary} />
              <Text style={[styles.directionsBtnText, { color: colors.primary }]}>Go</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenProfile}
              style={[styles.bookBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.bookBtnText, { color: colors.onBrand }]}>
                Book
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  recenterButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  selectedCard: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 10,
  },
  cardAvatar: {
    width: 54,
    height: 54,
    borderRadius: 14,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    marginRight: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardRating: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardBrand: {
    fontSize: 12,
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  metaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#888",
  },
  cardActionsCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
  },
  directionsBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bookBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  bookBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

