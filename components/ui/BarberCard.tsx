import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import { BrandPhotos } from "@/theme/colors";

export interface BarberCardProps {
  id: string | number;
  name: string;
  specialty?: string;
  rating?: number | string;
  reviewCount?: number;
  location?: string;
  distance?: string;
  price?: number | string;
  imageUrl?: any;
  isSalon?: boolean;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
  onBookPress?: () => void;
  onPress?: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

export function BarberCard({
  name,
  specialty,
  rating = 4.9,
  distance = "Nearby",
  price,
  imageUrl,
  isSalon,
  isFavorite = false,
  onFavoritePress,
  onBookPress,
  onPress,
  compact = false,
  style,
}: BarberCardProps) {
  const { colors, typography } = useTheme();

  const imageSource =
    typeof imageUrl === "string"
      ? imageUrl.trim()
        ? { uri: imageUrl }
        : { uri: BrandPhotos.shopCover }
      : imageUrl || { uri: BrandPhotos.shopCover };

  const numericRating =
    rating !== undefined && rating !== null ? Number(rating) : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.imageContainer,
          {
            height: compact ? 136 : 164,
            backgroundColor: colors.secondarySurface,
          },
        ]}
      >
        <Image source={imageSource} style={styles.image} resizeMode="cover" />

        {numericRating > 0 && (
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color={colors.brand} />
            <Text
              style={[
                styles.ratingText,
                {
                  color: colors.primaryText,
                  fontFamily: typography.fontFamily.bold,
                },
              ]}
            >
              {numericRating.toFixed(1)}
            </Text>
          </View>
        )}

        {isSalon && (
          <View style={styles.salonPill}>
            <Text
              style={[
                styles.salonPillText,
                {
                  color: colors.primaryText,
                  fontFamily: typography.fontFamily.semiBold,
                },
              ]}
            >
              Salon
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.name,
            {
              color: colors.primaryText,
              fontFamily: typography.fontFamily.bold,
            },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>

        <View style={styles.statusRow}>
          <Text
            style={[
              styles.openText,
              {
                color: colors.brand,
                fontFamily: typography.fontFamily.semiBold,
              },
            ]}
          >
            {price !== undefined && Number(price) > 0
              ? `From ${typeof price === "number" ? `${price.toLocaleString()} XAF` : price}`
              : "Available"}
          </Text>
          {!!specialty && (
            <Text
              style={[
                styles.specialty,
                {
                  color: colors.secondaryText,
                  fontFamily: typography.fontFamily.regular,
                },
              ]}
              numberOfLines={1}
            >
              {" · "}
              {specialty}
            </Text>
          )}
        </View>

        <View style={styles.locationRow}>
          <Ionicons
            name="location-sharp"
            size={13}
            color={colors.primaryText}
          />
          <Text
            style={[
              styles.distance,
              {
                color: colors.secondaryText,
                fontFamily: typography.fontFamily.medium,
              },
            ]}
            numberOfLines={1}
          >
            {distance}
          </Text>
        </View>

        <View style={styles.ctaRow}>
          {onFavoritePress && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation?.();
                onFavoritePress();
              }}
              accessibilityRole="button"
              accessibilityLabel={
                isFavorite ? "Remove from saved" : "Save barber"
              }
              style={[
                styles.bookmarkBtn,
                {
                  backgroundColor: colors.background,
                  borderColor: isFavorite ? colors.brand : colors.border,
                },
              ]}
            >
              <Ionicons
                name={isFavorite ? "bookmark" : "bookmark-outline"}
                size={17}
                color={isFavorite ? colors.brand : colors.secondaryText}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={(e) => {
              e.stopPropagation?.();
              if (onBookPress) {
                onBookPress();
              } else {
                onPress?.();
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`Book ${name}`}
            style={[styles.bookNowBtn, { backgroundColor: colors.brand }]}
          >
            <Text
              style={[
                styles.bookNowText,
                {
                  color: colors.onBrand,
                  fontFamily: typography.fontFamily.bold,
                },
              ]}
            >
              Book Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  imageContainer: {
    width: "100%",
    borderRadius: 13,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  ratingPill: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(23, 25, 24, 0.78)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ratingText: {
    fontSize: 11.5,
  },
  salonPill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(23, 25, 24, 0.78)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  salonPillText: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  content: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  name: {
    fontSize: 15,
    letterSpacing: -0.1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  openText: {
    fontSize: 12.5,
  },
  specialty: {
    fontSize: 12,
    flex: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  distance: {
    fontSize: 12,
    flex: 1,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 11,
  },
  bookmarkBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bookNowBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bookNowText: {
    fontSize: 13.5,
    letterSpacing: 0.1,
  },
});

export default BarberCard;
