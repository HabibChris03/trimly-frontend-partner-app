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
import Rating from "./Rating";

export interface BarberCardProps {
  id: string | number;
  name: string;
  specialty?: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
  distance?: string;
  price?: number | string;
  imageUrl?: any;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
  onPress?: () => void;
  style?: ViewStyle;
}

export function BarberCard({
  name,
  specialty,
  rating = 4.9,
  reviewCount = 24,
  location,
  distance = "1.2 km",
  price,
  imageUrl,
  isFavorite = false,
  onFavoritePress,
  onPress,
  style,
}: BarberCardProps) {
  const { colors, radius, spacing, typography, shadows } = useTheme();

  const imageSource =
    typeof imageUrl === "string"
      ? { uri: imageUrl }
      : imageUrl || require("@/assets/images/profilepic white.png");

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          borderColor: colors.border,
          borderWidth: 1,
        },
        shadows.card,
        style,
      ]}
    >
      <View style={styles.imageContainer}>
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
        {onFavoritePress && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onFavoritePress}
            style={[
              styles.favoriteBtn,
              {
                backgroundColor: "rgba(0,0,0,0.35)",
                borderRadius: radius.full,
              },
            ]}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={18}
              color={isFavorite ? "#EF4444" : "#FFFFFF"}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.content, { padding: spacing.md }]}>
        <View style={styles.row}>
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
          <Rating rating={rating} showScore size={13} />
        </View>

        {specialty && (
          <Text
            style={[
              styles.specialty,
              {
                color: colors.secondaryText,
                fontFamily: typography.fontFamily.medium,
                marginTop: 2,
              },
            ]}
            numberOfLines={1}
          >
            {specialty}
          </Text>
        )}

        <View style={[styles.footer, { marginTop: spacing.sm }]}>
          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={13}
              color={colors.secondaryText}
            />
            <Text
              style={[
                styles.distance,
                {
                  color: colors.secondaryText,
                  fontFamily: typography.fontFamily.regular,
                  marginLeft: 3,
                },
              ]}
            >
              {distance}
            </Text>
          </View>

          {price !== undefined && (
            <Text
              style={[
                styles.price,
                {
                  color: colors.primary,
                  fontFamily: typography.fontFamily.bold,
                },
              ]}
            >
              From {typeof price === "number" ? `XAF ${price.toLocaleString()}` : price}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    marginBottom: 16,
  },
  imageContainer: {
    height: 140,
    width: "100%",
    backgroundColor: "#F0F0F0",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  favoriteBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  specialty: {
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  distance: {
    fontSize: 12,
  },
  price: {
    fontSize: 14,
  },
});

export default BarberCard;
