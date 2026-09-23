import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { barberService } from "@/services/barberService";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
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

const { width } = Dimensions.get("window");

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
  const colors = useColors();
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
        const [portfolioList, nearbyBarbers] = await Promise.all([
          barberService.getBarberPortfolio(4).catch(() => []),
          barberService.getNearbyBarbers().catch(() => []),
        ]);

        const items: GalleryItem[] = [];
        if (Array.isArray(portfolioList) && portfolioList.length > 0) {
          portfolioList.forEach((p: any, idx: number) => {
            if (p.media_url) {
              items.push({
                id: `p-${p.id || idx}`,
                styleName: p.hairstyle_name || p.hairstyle_or_service_name || "Custom Haircut",
                barberName: "Master Barber",
                price: 25000,
                likes: p.likes || 120 + (idx * 15),
                image: p.media_url,
                category: p.category || (idx % 2 === 0 ? "Skin Fades" : "Classic"),
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

  // Split into two columns for masonry layout
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
    const cardHeight = item.tall ? 240 : 180;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.88}
        onPress={() => handleCardPress(item)}
        style={[
          styles.galleryCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfacevariant,
            height: cardHeight,
          },
        ]}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        {/* Gradient overlay at bottom */}
        <View style={styles.cardOverlay}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => toggleLike(item.id)}
            style={styles.heartButton}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={18}
              color={isLiked ? "#EF4444" : "#FFFFFF"}
            />
          </TouchableOpacity>

          <View style={styles.cardMeta}>
            <Text style={styles.cardStyleName} numberOfLines={1}>
              {item.styleName}
            </Text>
            <Text style={styles.cardBarberName} numberOfLines={1}>
              {item.category}
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

        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
          {t("portfolioGallery.styleGalleryTitle")}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: "/Pages/style-search-results" as any,
            })
          }
          style={styles.headerBtn}
        >
          <Ionicons name="search-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
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
                  backgroundColor: isSelected ? "#A3B39C" : colors.surface,
                  borderColor: isSelected ? "#A3B39C" : colors.surfacevariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: isSelected ? "#1C1E1B" : colors.primarytext,
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

      {/* Masonry Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.masonryContent}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={40} color={colors.secondarytext} />
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
        style={[styles.floatingCTA, { backgroundColor: "#A3B39C" }]}
      >
        <Ionicons name="add-circle-outline" size={18} color="#1C1E1B" />
        <Text style={styles.floatingCTAText}>{t("portfolioGallery.bookNow")}</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
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
  masonryContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  masonryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  column: {
    flex: 1,
    gap: 10,
  },
  galleryCard: {
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
  cardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  heartButton: {
    position: "absolute",
    top: -140,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardMeta: {
    flex: 1,
  },
  cardStyleName: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  cardBarberName: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
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
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  floatingCTAText: {
    color: "#1C1E1B",
    fontSize: 15,
    fontWeight: "700",
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
