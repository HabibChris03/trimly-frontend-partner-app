import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { barberService } from "@/services/barberService";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

interface GalleryItem {
  id: string;
  styleName: string;
  barberName: string;
  price: number;
  likes: number;
  image: string;
  category: string;
  tall?: boolean;
}

const CATEGORIES = ["All", "Skin Fades", "Classic", "Beard", "Locs", "Color"];

export default function GalleryScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();

  const getCategoryLabel = (cat: string) => {
    if (cat === "All") return t("portfolioGallery.catAll");
    if (cat === "Skin Fades") return t("portfolioGallery.catFades");
    if (cat === "Classic") return t("portfolioGallery.catClassic");
    if (cat === "Beard") return t("portfolioGallery.catBeard");
    if (cat === "Locs") return t("portfolioGallery.catLocs");
    if (cat === "Color") return t("portfolioGallery.catColor");
    return cat;
  };

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [likedItems, setLikedItems] = useState<string[]>([]);

  // ImageViewerModal state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerItem, setViewerItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setIsLoading(true);
        const [portfolioList] = await Promise.all([
          barberService.getBarberPortfolio(4).catch(() => []),
          barberService.getNearbyBarbers().catch(() => []),
        ]);

        const items: GalleryItem[] = [];
        if (Array.isArray(portfolioList) && portfolioList.length > 0) {
          portfolioList.forEach((p: any, idx: number) => {
            if (p.media_url) {
              items.push({
                id: `p-${p.id || idx}`,
                styleName:
                  p.hairstyle_name ||
                  p.hairstyle_or_service_name ||
                  "Custom Haircut",
                barberName: "Master Barber",
                price: (Number(p.price) > 0 ? Number(p.price) : 1000),
                likes: p.likes || 120 + idx * 15,
                image: p.media_url,
                category:
                  p.category || (idx % 2 === 0 ? "Skin Fades" : "Classic"),
                tall: idx % 3 === 0,
              });
            }
          });
        }

        setGalleryItems(items);
      } catch {
        setGalleryItems([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  const filteredItems =
    selectedCategory === "All"
      ? galleryItems
      : galleryItems.filter((item) => item.category === selectedCategory);

  // Split into two columns for masonry layout matching Reference Right Phone
  const leftColumn: GalleryItem[] = [];
  const rightColumn: GalleryItem[] = [];
  filteredItems.forEach((item, index) => {
    if (index % 2 === 0) leftColumn.push(item);
    else rightColumn.push(item);
  });

  const toggleLike = (id: string) => {
    if (likedItems.includes(id)) {
      setLikedItems(likedItems.filter((l) => l !== id));
    } else {
      setLikedItems([...likedItems, id]);
    }
  };

  const handleCardPress = (item: GalleryItem) => {
    setViewerItem(item);
    setViewerVisible(true);
  };

  const renderCard = (item: GalleryItem) => {
    const isLiked = likedItems.includes(item.id);
    const cardHeight = item.tall ? 228 : 178;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.88}
        onPress={() => handleCardPress(item)}
        style={[
          styles.galleryCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            height: cardHeight,
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
          style={styles.heartButton}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={16}
            color={isLiked ? colors.error : "#F5F5F2"}
          />
        </TouchableOpacity>

        <View style={styles.cardOverlay}>
          <View style={styles.cardMeta}>
            <Text style={styles.cardStyleName} numberOfLines={1}>
              {item.styleName}
            </Text>
            <Text style={styles.cardBarberName} numberOfLines={1}>
              {(Number(item.price) > 0 ? Number(item.price) : 1000).toLocaleString()} {t("common.cfa")} • {item.category}
            </Text>
          </View>
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

      {/* Header matching Reference Right Phone */}
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

        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
          {t("portfolioGallery.styleGalleryTitle")}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/Pages/notifications" as any)}
          style={[
            styles.headerBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="notifications-outline"
            size={19}
            color={colors.primarytext}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar Trigger matching Reference Right Phone */}
      <View style={styles.searchWrap}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/Pages/style-search-results" as any,
            })
          }
          style={[
            styles.searchBarTrigger,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.secondarytext}
          />
          <Text
            style={[styles.searchPlaceholder, { color: colors.secondarytext }]}
          >
            {t("common.search") || "Search"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      <View style={{ flexShrink: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.75}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isSelected ? colors.onBrand : colors.primarytext,
                      fontWeight: isSelected ? "700" : "500",
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
      <View
        style={[styles.captionDivider, { borderBottomColor: colors.border }]}
      >
        <Text style={[styles.captionText, { color: colors.secondarytext }]}>
          Scroll down for more styles
        </Text>
      </View>

      {/* 2-Column Masonry Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.masonryContent}
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
              {t("portfolioGallery.noStylesFound")}
            </Text>
          </View>
        ) : (
          <View style={styles.masonryGrid}>
            <View style={styles.column}>{leftColumn.map(renderCard)}</View>
            <View style={styles.column}>{rightColumn.map(renderCard)}</View>
          </View>
        )}
      </ScrollView>

      {/* Floating Book Now CTA */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push("/Pages/booking-detail")}
        style={[styles.floatingCTA, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.onBrand} />
        <Text style={[styles.floatingCTAText, { color: colors.onBrand }]}>
          {t("portfolioGallery.bookNow")}
        </Text>
      </TouchableOpacity>

      {/* Fullscreen Image Viewer Modal */}
      <ImageViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        imageUrl={viewerItem?.image || null}
        title={viewerItem?.styleName}
        barberName={viewerItem?.barberName}
        serviceCategory={viewerItem?.category}
        likesCount={viewerItem?.likes}
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
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  searchWrap: {
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  searchBarTrigger: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 14,
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
  masonryContent: {
    paddingHorizontal: 18,
    paddingBottom: 92,
  },
  masonryGrid: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  galleryCard: {
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
  heartButton: {
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
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  cardMeta: {
    flex: 1,
  },
  cardStyleName: {
    color: "#F5F5F2",
    fontSize: 12.5,
    fontWeight: "700",
  },
  cardBarberName: {
    color: "#C7F36B",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  floatingCTA: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 14,
  },
  floatingCTAText: {
    fontSize: 14.5,
    fontWeight: "700",
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
