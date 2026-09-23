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
}

export default function ImageViewerModal({
  visible,
  onClose,
  imageUrl,
  title,
  barberName,
  serviceCategory,
  likesCount,
}: ImageViewerModalProps) {
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
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                by {barberName}
              </Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
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
                <Ionicons name="cut-outline" size={13} color="#A3B39C" />
                <Text style={styles.categoryBadgeText}>{serviceCategory}</Text>
              </View>
            ) : (
              <View style={styles.categoryBadge}>
                <Ionicons name="sparkles-outline" size={13} color="#A3B39C" />
                <Text style={styles.categoryBadgeText}>Custom Cut</Text>
              </View>
            )}

            {likesCount !== undefined && likesCount > 0 && (
              <View style={styles.likesBadge}>
                <Ionicons name="heart" size={14} color="#EF4444" />
                <Text style={styles.likesText}>{likesCount} likes</Text>
              </View>
            )}
          </View>

          <Text style={styles.pinchHint}>Pinch to zoom • Tap close to return</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
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
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#A3B39C",
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
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
    height: SCREEN_HEIGHT * 0.7,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: "rgba(15, 16, 14, 0.8)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
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
    backgroundColor: "rgba(163, 179, 156, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(163, 179, 156, 0.3)",
  },
  categoryBadgeText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#A3B39C",
  },
  likesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  likesText: {
    fontSize: 13,
    color: "#E5E7EB",
    fontWeight: "500",
  },
  pinchHint: {
    fontSize: 11.5,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
});
