import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "@/context/LanguageContext";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { barberService } from "@/services/barberService";

interface PortfolioItem {
  id: string;
  category: string;
  image: string;
  title: string;
  price?: number;
  tall?: boolean;
}

const CATEGORIES = ["All", "Fades", "Classic", "Beard", "Color"];

export default function PortfolioGalleryScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ barberId?: string; barberName?: string }>();

  const barberIdNum = parseInt(params.barberId || "4", 10) || 4;
  const barberName = params.barberName || "Master Barber";

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [barberRating, setBarberRating] = useState<number>(0);
  const [clientCount, setClientCount] = useState<number>(0);

  // Fullscreen ImageViewerModal state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerItem, setViewerItem] = useState<PortfolioItem | null>(null);

  const getCategoryLabel = (cat: string) => {
    if (cat === "All") return t("portfolioGallery.catAll");
    if (cat === "Fades") return t("portfolioGallery.catFades");
    if (cat === "Classic") return t("portfolioGallery.catClassic");
    if (cat === "Beard") return t("portfolioGallery.catBeard");
    if (cat === "Color") return t("portfolioGallery.catColor");
    return cat;
  };

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setIsLoading(true);
        const [list, profile] = await Promise.all([
          barberService.getBarberPortfolio(barberIdNum).catch(() => []),
          barberService.getBarberProfile(barberIdNum).catch(() => null),
        ]);
        if (Array.isArray(list)) {
          setPortfolioItems(
            list.map((item, idx) => ({
              id: item.id ? item.id.toString() : `port-${idx}`,
              category: item.category || (idx % 2 === 0 ? "Fades" : "Classic"),
              image: item.media_url || item.uri,
              title:
                item.hairstyle_name ||
                item.hairstyle_or_service_name ||
                "Signature Cut",
              price: item.price !== undefined ? Number(item.price) : undefined,
              tall: idx % 3 === 0,
            }))
          );
        }
        if (profile) {
          setBarberRating(profile.rating != null ? Number(profile.rating) : 0);
          setClientCount(profile.clients_count || profile.total_clients || 0);
        }
      } catch {
        setPortfolioItems([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadPortfolio();
  }, [barberIdNum]);

  const filteredItems =
    selectedCategory === "All"
      ? portfolioItems
      : portfolioItems.filter((item) => item.category === selectedCategory);

  const leftColumn = filteredItems.filter((_, i) => i % 2 === 0);
  const rightColumn = filteredItems.filter((_, i) => i % 2 !== 0);

  const toggleLike = (id: string) => {
    if (likedItems.includes(id)) {
      setLikedItems(likedItems.filter((l) => l !== id));
    } else {
      setLikedItems([...likedItems, id]);
    }
  };

  const handleItemPress = (item: PortfolioItem) => {
    setViewerItem(item);
    setViewerVisible(true);
  };

  const renderItem = (item: PortfolioItem) => {
    const isLiked = likedItems.includes(item.id);
    const cardHeight = item.tall ? 228 : 178;
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.88}
        onPress={() => handleItemPress(item)}
        style={[
          styles.portfolioCard,
          {
            height: cardHeight,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => toggleLike(item.id)}
          style={styles.likeBtn}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={16}
            color={isLiked ? colors.error : "#F5F5F2"}
          />
        </TouchableOpacity>
        <View style={styles.cardOverlay}>
          <Text style={styles.cardTitleText} numberOfLines={1}>
            {item.title || item.category}
          </Text>
          <Text style={styles.cardMetaText} numberOfLines={1}>
            {item.price
              ? `${item.price.toLocaleString()} CFA • ${item.category}`
              : item.category}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Dark Urban Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[
            styles.headerBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primarytext} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
            {t("portfolioGallery.title")}
          </Text>
          <Text style={[styles.headerSub, { color: colors.secondarytext }]}>
            {barberName}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/Pages/booking-calendar" as any,
              params: { barberName },
            })
          }
          style={[styles.bookHeaderBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.bookHeaderBtnText, { color: colors.onBrand }]}>
            {t("portfolioGallery.bookBtn")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View
        style={[
          styles.statsRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primarytext }]}>
            {portfolioItems.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondarytext }]}>
            {t("portfolioGallery.works")}
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.statItem}>
          <View style={styles.ratingValueRow}>
            <Ionicons name="star" size={14} color={colors.star} />
            <Text style={[styles.statValue, { color: colors.primarytext, marginBottom: 0 }]}>
              {barberRating > 0 ? barberRating.toFixed(1) : "0.0"}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.secondarytext }]}>
            {t("portfolioGallery.rating")}
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primarytext }]}>
            {clientCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondarytext }]}>
            {t("portfolioGallery.clients")}
          </Text>
        </View>
      </View>

      {/* Category Filter */}
      <View style={{ flexShrink: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.75}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isActive ? colors.onBrand : colors.primarytext,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {getCategoryLabel(cat)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Centered Caption & Divider matching Reference Right Phone */}
      <View style={[styles.captionDivider, { borderBottomColor: colors.border }]}>
        <Text style={[styles.captionText, { color: colors.secondarytext }]}>
          Scroll down for more styles
        </Text>
      </View>

      {/* 2-Column Masonry Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
      >
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="images-outline"
                size={34}
                color={colors.secondarytext}
              />
            </View>
            <Text style={[styles.emptyText, { color: colors.secondarytext }]}>
              {t("portfolioGallery.noPhotos")}
            </Text>
          </View>
        ) : (
          <View style={styles.masonryGrid}>
            <View style={styles.column}>{leftColumn.map(renderItem)}</View>
            <View style={styles.column}>{rightColumn.map(renderItem)}</View>
          </View>
        )}
      </ScrollView>

      {/* Fullscreen Image Viewer Modal */}
      <ImageViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        imageUrl={viewerItem?.image || null}
        title={viewerItem?.title}
        barberName={barberName}
        serviceCategory={viewerItem?.category}
      />
    </SafeAreaView>
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
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  bookHeaderBtn: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bookHeaderBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 13,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  ratingValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11.5,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  categoriesRow: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 15,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryText: {
    fontSize: 12.5,
  },
  captionDivider: {
    marginHorizontal: 18,
    paddingBottom: 10,
    marginBottom: 14,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  captionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  gridContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  masonryGrid: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  portfolioCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  likeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(23, 25, 24, 0.72)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: "rgba(23, 25, 24, 0.76)",
  },
  cardTitleText: {
    color: "#F5F5F2",
    fontSize: 12.5,
    fontWeight: "700",
  },
  cardMetaText: {
    color: "#C7F36B",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});
