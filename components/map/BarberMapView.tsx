import {
  DEFAULT_MAP_REGION,
} from "@/constants/maps";
import { Skeleton } from "@/components/ui/Skeleton";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { barberService } from "@/services/barberService";
import { useThemeImages } from "@/hooks/useThemeImages";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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
  selectedId: string | number | null
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
      overflow: hidden;
    }
    .leaflet-container { background: #1C1E1B; }
    .barber-pin {
      background: #232720;
      border: 2px solid #383D34;
      border-radius: 20px;
      padding: 5px 9px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #FFFFFF;
      font-size: 11.5px;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
      cursor: pointer;
      white-space: nowrap;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .barber-pin:hover {
      transform: scale(1.1);
      border-color: #A3B39C;
    }
    .barber-pin.selected {
      background: #A3B39C;
      color: #141712;
      border-color: #FFFFFF;
      transform: scale(1.15);
      box-shadow: 0 6px 18px rgba(163,179,156,0.4);
    }
    .barber-pin .star {
      color: #FBBF24;
      font-size: 11px;
    }
    .barber-pin.selected .star {
      color: #141712;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var barbers = ${JSON.stringify(barbersData)};
    var defaultCenter = [${centerLat}, ${centerLng}];
    var map = L.map('map', { zoomControl: false }).setView(defaultCenter, 13);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(map);

    barbers.forEach(function(b) {
      var isSel = b.isSelected;
      var firstName = b.name.split(' ')[0] || b.name;
      var icon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: '<div class="barber-pin ' + (isSel ? 'selected' : '') + '">' +
              '<span class="star">★</span>' +
              '<span>' + b.rating + '</span> • <span>' + firstName + '</span>' +
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
  const colors = useColors();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
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
    if (Platform.OS !== "web") return;
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

  const handleMarkerPress = (barber: BarberLocationItem) => {
    setSelectedBarber(barber);
    if (onSelectBarber) onSelectBarber(barber);

    if (Platform.OS === "web") {
      webIframeRef.current?.contentWindow?.postMessage(
        { type: "PAN_TO", lat: barber.latitude, lng: barber.longitude },
        "*"
      );
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: barber.latitude - 0.006,
        longitude: barber.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      500
    );
  };

  const handleRecenter = () => {
    if (Platform.OS === "web") {
      webIframeRef.current?.contentWindow?.postMessage({ type: "RECENTER" }, "*");
      return;
    }
    mapRef.current?.animateToRegion(DEFAULT_MAP_REGION, 500);
  };

  const handleGetDirections = (barber: BarberLocationItem) => {
    const lat = barber.latitude;
    const lng = barber.longitude;
    const label = encodeURIComponent(barber.name);

    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    if (Platform.OS === "ios") {
      const appleMapsUrl = `maps://?daddr=${lat},${lng}&q=${label}`;
      Linking.canOpenURL(appleMapsUrl).then((supported) => {
        if (supported) {
          Linking.openURL(appleMapsUrl);
        } else {
          Linking.openURL(fallbackUrl);
        }
      }).catch(() => Linking.openURL(fallbackUrl));
    } else {
      const googleMapsUrl = `google.navigation:q=${lat},${lng}`;
      Linking.canOpenURL(googleMapsUrl).then((supported) => {
        if (supported) {
          Linking.openURL(googleMapsUrl);
        } else {
          Linking.openURL(fallbackUrl);
        }
      }).catch(() => Linking.openURL(fallbackUrl));
    }
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
      {Platform.OS === "web" ? (
        React.createElement("iframe", {
          ref: webIframeRef,
          srcDoc: generateWebMapHtml(barbersList, selectedBarber?.id || null),
          style: {
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "#1C1E1B",
          },
          title: "Trimly Barber Map",
        })
      ) : (
        <MapView
          ref={mapRef}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          mapType="satellite"
          style={styles.map}
          initialRegion={DEFAULT_MAP_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {barbersList.map((barber) => {
            const isSelected = selectedBarber?.id === barber.id;
            return (
              <Marker
                key={barber.id}
                coordinate={{
                  latitude: barber.latitude,
                  longitude: barber.longitude,
                }}
                onPress={() => handleMarkerPress(barber)}
              >
                <View style={styles.markerWrapper}>
                  <View
                    style={[
                      styles.customMarker,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surface,
                        borderColor: isSelected
                          ? "#FFFFFF"
                          : colors.surfacevariant,
                        transform: [{ scale: isSelected ? 1.15 : 1 }],
                      },
                    ]}
                  >
                    <Image source={barber.avatar} style={styles.markerAvatar} />
                    <View
                      style={[
                        styles.markerRatingBadge,
                        { backgroundColor: isSelected ? "#232720" : colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.markerRatingText,
                          { color: isSelected ? "#FFFFFF" : colors.background },
                        ]}
                      >
                        {barber.rating}★
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.markerArrow,
                      {
                        borderTopColor: isSelected
                          ? colors.primary
                          : colors.surface,
                      },
                    ]}
                  />
                </View>
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* Floating Recenter Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleRecenter}
        style={[
          styles.recenterButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfacevariant,
          },
        ]}
      >
        <Ionicons name="locate" size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Selected Barber Floating Info Card */}
      {isLoading ? (
        <View
          style={[
            styles.selectedCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
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
              borderColor: colors.surfacevariant,
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
                <Ionicons name="star" size={13} color="#FBBF24" />
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
                  From {selectedBarber.amount} CFA
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
              <Text style={[styles.bookBtnText, { color: colors.background }]}>
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
  map: {
    width: "100%",
    height: "100%",
  },
  markerWrapper: {
    alignItems: "center",
  },
  customMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    position: "relative",
  },
  markerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  markerRatingBadge: {
    position: "absolute",
    bottom: -6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  markerRatingText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  recenterButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  selectedCard: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  cardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#383D34",
  },
  cardInfo: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cardName: {
    fontSize: 15.5,
    fontWeight: "700",
    flex: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: 6,
  },
  cardRating: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardBrand: {
    fontSize: 12,
    fontWeight: "400",
    marginBottom: 6,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 11.5,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#687067",
  },
  cardActionsCol: {
    alignItems: "center",
    gap: 6,
  },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  directionsBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  bookBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
});