import * as ImagePicker from "expo-image-picker";
import { barberService } from "@/services/barberService";
import { CustomModal } from "@/components/ui/CustomModal";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 44) / 2;

interface PortfolioItem {
  id: string;
  title: string;
  uri: string;
  likes: number;
}

export default function BarberPortfolioScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const barberId = user?.id || 4;

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [cutTitle, setCutTitle] = useState("");
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fullscreen ImageViewer state
  const [viewerItem, setViewerItem] = useState<PortfolioItem | null>(null);

  // Delete confirmation state
  const [itemToDelete, setItemToDelete] = useState<PortfolioItem | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      const items = await barberService.getBarberPortfolio(barberId);
      if (Array.isArray(items)) {
        const mapped: PortfolioItem[] = items
          .filter((item) => item.media_url || item.uri)
          .map((item, idx) => ({
            id: (item.id || idx + 1).toString(),
            title:
              item.hairstyle_name ||
              item.hairstyle_or_service_name ||
              "Hairstyle Cut",
            uri: item.media_url || item.uri,
            likes: item.likes || 0,
          }));
        setPortfolio(mapped);
      } else {
        setPortfolio([]);
      }
    } catch {
      setPortfolio([]);
    } finally {
      setIsLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPortfolio();
    setRefreshing(false);
  }, [fetchPortfolio]);

  const handlePickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast(
        "Please allow photo library access to upload cuts.",
        "warning"
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast("Please allow camera access to take cut photos.", "warning");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedImageUri(result.assets[0].uri);
    }
  };

  const handleUploadCut = async () => {
    if (!pickedImageUri) {
      showToast("Please select or take a photo of the cut.", "warning");
      return;
    }
    if (!cutTitle.trim()) {
      showToast("Please enter a title or style name for this cut.", "warning");
      return;
    }

    setIsUploading(true);
    try {
      const res = await barberService.uploadPortfolio({
        media_url: pickedImageUri,
        media_type: "image",
        hairstyle_or_service_name: cutTitle.trim(),
      });

      const newItem: PortfolioItem = {
        id: (res?.id || Date.now()).toString(),
        title: cutTitle.trim(),
        uri: res?.media_url || pickedImageUri,
        likes: 0,
      };

      setPortfolio((prev) => [newItem, ...prev]);
      setModalVisible(false);
      setCutTitle("");
      setPickedImageUri(null);
      showToast("New hairstyle cut added to your portfolio.", "success");
    } catch {
      showToast("Failed to upload portfolio cut.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDeleteCut = async () => {
    if (!itemToDelete) return;
    const itemIdNum = parseInt(itemToDelete.id, 10);
    try {
      if (!isNaN(itemIdNum)) {
        await barberService.deletePortfolioItem(itemIdNum).catch(() => null);
      }
      setPortfolio((prev) => prev.filter((p) => p.id !== itemToDelete.id));
      showToast("Hairstyle cut removed from portfolio.", "info");
    } catch {
      showToast("Could not delete portfolio cut.", "error");
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
            {t("barber.myPortfolio")}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.secondarytext }]}
          >
            {t("barberProfile.portfolioTab")}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
          style={[styles.addButton, { backgroundColor: "#A3B39C" }]}
        >
          <Ionicons name="add" size={22} color="#1C1E1B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A3B39C"
            colors={["#A3B39C"]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A3B39C" />
            <Text style={[styles.loadingText, { color: colors.secondarytext }]}>
              {t("common.loading")}
            </Text>
          </View>
        ) : portfolio.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.surfacevariant },
              ]}
            >
              <Ionicons name="images-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
              {t("barberProfile.noPortfolioYet")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
              Upload photos of your haircuts and trims to showcase your work directly on your profile for clients.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setModalVisible(true)}
              style={[styles.emptyUploadBtn, { backgroundColor: "#A3B39C" }]}
            >
              <Ionicons name="camera-outline" size={18} color="#1C1E1B" />
              <Text style={styles.emptyUploadBtnText}>+ Add First Cut</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {portfolio.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfacevariant,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setViewerItem(item)}
                  style={styles.imageWrap}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  {/* Fullscreen Expand Hint */}
                  <View style={styles.expandPill}>
                    <Ionicons name="expand-outline" size={13} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

                <View style={styles.cardInfo}>
                  <Text
                    style={[styles.cardTitle, { color: colors.primarytext }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.likesRow}>
                      <Ionicons name="heart" size={13} color="#EF4444" />
                      <Text
                        style={[
                          styles.likesText,
                          { color: colors.secondarytext },
                        ]}
                      >
                        {item.likes}
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setItemToDelete(item)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color={colors.secondarytext}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Fullscreen Image Viewer Modal */}
      <ImageViewerModal
        visible={!!viewerItem}
        onClose={() => setViewerItem(null)}
        imageUrl={viewerItem?.uri || null}
        title={viewerItem?.title}
        barberName={user?.name || "My Portfolio"}
        likesCount={viewerItem?.likes}
      />

      {/* Delete Cut Custom Modal */}
      <CustomModal
        visible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Remove Portfolio Cut"
        description={`Are you sure you want to remove "${itemToDelete?.title}" from your public portfolio?`}
        icon="trash-outline"
        primaryText="Delete Cut"
        primaryDanger={true}
        onPrimary={confirmDeleteCut}
        secondaryText="Cancel"
        onSecondary={() => setItemToDelete(null)}
      />

      {/* Add New Cut Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.primarytext }]}>
              Add Hairstyle to Portfolio
            </Text>

            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              Style / Cut Title
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.surfacevariant,
                  color: colors.primarytext,
                },
              ]}
              placeholder="e.g. Sharp Taper Fade"
              placeholderTextColor={colors.inputPlaceholder}
              value={cutTitle}
              onChangeText={setCutTitle}
            />

            {/* Photo Selection Preview & Buttons */}
            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              Hairstyle Photo
            </Text>

            {pickedImageUri ? (
              <Image
                source={{ uri: pickedImageUri }}
                style={styles.previewImage}
              />
            ) : null}

            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickFromGallery}
                style={[
                  styles.photoActionBtn,
                  { backgroundColor: colors.surfacevariant },
                ]}
              >
                <Ionicons name="image-outline" size={16} color="#FFFFFF" />
                <Text style={styles.photoActionText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTakePhoto}
                style={[
                  styles.photoActionBtn,
                  { backgroundColor: colors.surfacevariant },
                ]}
              >
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                <Text style={styles.photoActionText}>Camera</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setModalVisible(false)}
                style={[
                  styles.modalCancelBtn,
                  { borderColor: colors.surfacevariant },
                ]}
              >
                <Text
                  style={[
                    styles.modalCancelBtnText,
                    { color: colors.secondarytext },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleUploadCut}
                disabled={isUploading}
                style={[styles.modalSaveBtn, { backgroundColor: "#A3B39C" }]}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#1C1E1B" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Upload to Portfolio</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13.5,
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    marginTop: 30,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  emptyUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyUploadBtnText: {
    color: "#1C1E1B",
    fontSize: 14.5,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 165,
  },
  expandPill: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 5,
    borderRadius: 12,
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  likesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likesText: {
    fontSize: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  previewImage: {
    width: "100%",
    height: 140,
    borderRadius: 14,
    marginBottom: 10,
    marginTop: 4,
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  photoActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    flex: 2,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSaveBtnText: {
    color: "#1C1E1B",
    fontSize: 14.5,
    fontWeight: "700",
  },
});
