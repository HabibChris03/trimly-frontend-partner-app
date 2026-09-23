import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeImages } from "@/hooks/useThemeImages";
import { useLanguage } from "@/context/LanguageContext";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { barberService } from "@/services/barberService";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 36 - 10) / 2;

interface PortfolioItem {
  id: string;
  category: string;
  image: string;
  title: string;
  tall?: boolean;
}

const CATEGORIES = ["All", "Fades", "Classic", "Beard", "Color"];

export default function PortfolioGalleryScreen() {
  const colors = useColors();
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
              title: item.hairstyle_name || item.hairstyle_or_service_name || "Signature Cut",
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
    const cardHeight = item.tall ? 230 : 170;
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.88}
        onPress={() => handleItemPress(item)}
        style={[
          styles.portfolioCard,
          {
            height: cardHeight,
            borderColor: colors.surfacevariant,
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
            size={18}
            color={isLiked ? "#EF4444" : "#FFFFFF"}
          />
        </TouchableOpacity>
        <View style={styles.cardOverlay}>
          <Text style={styles.cardCategoryText}>{item.title || item.category}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
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
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: "/Pages/booking-calendar" as any,
              params: { barberName },
            })
          }
          style={[styles.bookHeaderBtn, { backgroundColor: "#A3B39C" }]}
        >
          <Text style={styles.bookHeaderBtnText}>{t("portfolioGallery.bookBtn")}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View
        style={[
          styles.statsRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfacevariant,
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
          style={[styles.statDivider, { backgroundColor: colors.surfacevariant }]}
        />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primarytext }]}>
            {barberRating > 0 ? barberRating.toFixed(1) : "0.0"}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondarytext }]}>
            {t("portfolioGallery.rating")}
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: colors.surfacevariant }]}
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
                  backgroundColor: isActive ? "#A3B39C" : colors.surface,
                  borderColor: isActive ? "#A3B39C" : colors.surfacevariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: isActive ? "#1C1E1B" : colors.primarytext,
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

      {/* Masonry Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={38} color={colors.secondarytext} />
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
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
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bookHeaderBtnText: {
    color: "#1C1E1B",
    fontSize: 13.5,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  categoriesRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  masonryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  column: {
    flex: 1,
    gap: 10,
  },
  portfolioCard: {
    borderRadius: 18,
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryTagText: {
    color: "#1C1E1B",
    fontSize: 11,
    fontWeight: "700",
  },
  cardOverlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardCategoryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});
