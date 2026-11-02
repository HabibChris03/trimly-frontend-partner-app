import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageViewerModalProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  barberName?: string;
  serviceCategory?: string;
  likesCount?: number;
  price?: number;
  duration_minutes?: number;
  onBookStyle?: () => void;
}

export default function ImageViewerModal({
  visible,
  onClose,
  imageUrl,
  title,
  barberName,
  serviceCategory,
  likesCount,
  price,
  duration_minutes,
  onBookStyle,
}: ImageViewerModalProps) {
  const { t, language } = useLanguage();
  const colors = useColors();

  if (!visible || !imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.overlay}>
        {/* Top Action Bar */}
        <View style={styles.topBar}>
          <View style={styles.headerInfo}>
            {title && (
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
            )}
            {barberName && (
              <Text
                style={[styles.headerSubtitle, { color: colors.brand }]}
                numberOfLines={1}
              >
                {language === "fr" ? "par" : "by"} {barberName}
              </Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={22} color="#F5F5F2" />
          </TouchableOpacity>
        </View>

        {/* Center Zoomable Image View */}
        <ScrollView
          style={styles.imageScroll}
          contentContainerStyle={styles.imageScrollContent}
          maximumZoomScale={3}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent={true}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </ScrollView>

        {/* Bottom Details Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfoRow}>
            {serviceCategory ? (
              <View style={styles.categoryBadge}>
                <Ionicons name="cut-outline" size={13} color="#C7F36B" />
                <Text style={styles.categoryBadgeText}>{serviceCategory}</Text>
              </View>
            ) : (
              <View style={styles.categoryBadge}>
                <Ionicons name="sparkles-outline" size={13} color="#C7F36B" />
                <Text style={styles.categoryBadgeText}>Custom Cut</Text>
              </View>
            )}

            {price !== undefined && price > 0 && (
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>
                  {(Number(price) > 0 ? Number(price) : 1000).toLocaleString()} {t("common.cfa")}
                </Text>
              </View>
            )}

            {duration_minutes !== undefined && duration_minutes > 0 && (
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={13} color="#C7F36B" />
                <Text style={styles.durationBadgeText}>{duration_minutes} mins</Text>
              </View>
            )}

            {likesCount !== undefined && likesCount > 0 && (
              <View style={styles.likesBadge}>
                <Ionicons name="heart" size={14} color="#EF4444" />
                <Text style={styles.likesText}>{likesCount} {language === "fr" ? "j'aime" : "likes"}</Text>
              </View>
            )}
          </View>

          {onBookStyle && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => {
                onClose();
                onBookStyle();
              }}
              style={styles.bookStyleButton}
            >
              <Ionicons name="calendar-outline" size={18} color="#171918" />
              <Text style={styles.bookStyleButtonText}>
                Book This Style {price ? `• ${(Number(price) > 0 ? Number(price) : 1000).toLocaleString()} {t("common.cfa")}` : ""}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.pinchHint}>{t("common.pinchToZoom") || "Pinch to zoom • Tap close to return"}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 17, 16, 0.97)",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#F5F5F2",
    letterSpacing: -0.1,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: "600",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#252926",
    borderWidth: 1,
    borderColor: "#383D38",
    alignItems: "center",
    justifyContent: "center",
  },
  imageScroll: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  imageScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.68,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: "#171918",
    borderTopWidth: 1,
    borderTopColor: "#383D38",
  },
  bottomInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#252926",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#383D38",
  },
  categoryBadgeText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#F5F5F2",
  },
  likesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  likesText: {
    fontSize: 13,
    color: "#A6ACA5",
    fontWeight: "500",
  },
  priceBadge: {
    backgroundColor: "rgba(199, 243, 107, 0.14)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(199, 243, 107, 0.35)",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(199, 243, 107, 0.14)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(199, 243, 107, 0.35)",
  },
  durationBadgeText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#C7F36B",
  },
  priceBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C7F36B",
  },
  bookStyleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C7F36B",
    height: 50,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 6,
  },
  bookStyleButtonText: {
    color: "#171918",
    fontSize: 15,
    fontWeight: "700",
  },
  pinchHint: {
    fontSize: 11.5,
    color: "#A6ACA5",
    textAlign: "center",
    marginTop: 4,
  },
});
