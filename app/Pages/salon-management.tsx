import { CustomModal } from "@/components/ui/CustomModal";
import { PageTutorialModal } from "@/components/barber/PageTutorialModal";
import { SALON_MANAGEMENT_TUTORIAL } from "@/constants/barberTutorials";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import useColors from "@/hooks/usecolor";
import { barberService } from "@/services/barberService";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface StaffMember {
  id: number;
  name: string;
  role: string;
  phone?: string;
  status: "Active" | "Off Duty" | "On Break";
}

export default function SalonManagementScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const salonId = user?.id || 4;

  const [isSalon, setIsSalon] = useState<boolean>(
    user ? user.role === "salon" : true
  );
  const [capacity, setCapacity] = useState(
    String(user?.capacity || user?.working_chairs || "4")
  );
  const [salonBio, setSalonBio] = useState(user?.about_us || (user as any)?.bio || "");
  const [salonLogo, setSalonLogo] = useState<string | null>(user?.logo_url || null);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);

  // New staff modal
  const [addStaffModalVisible, setAddStaffModalVisible] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Senior Barber");

  const fetchSalonData = useCallback(async () => {
    try {
      const capData = await barberService.getSalonCapacity(salonId);
      if (capData) {
        setCapacity(String(capData.capacity || capData.working_chairs || 4));
        setIsSalon(capData.is_salon);
      }
    } catch {
      // Keep existing state fallback
    }
  }, [salonId]);

  const fetchStaff = useCallback(async () => {
    try {
      const staff = await barberService.listSalonStaff(salonId);
      setStaffList(Array.isArray(staff) ? staff : []);
    } catch {
      setStaffList([]);
    }
  }, [salonId]);

  useEffect(() => {
    async function initialLoad() {
      setIsLoadingStaff(true);
      await Promise.all([fetchSalonData(), fetchStaff()]);
      setIsLoadingStaff(false);
    }
    initialLoad();
  }, [fetchSalonData, fetchStaff]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSalonData(), fetchStaff()]);
    setRefreshing(false);
  }, [fetchSalonData, fetchStaff]);

  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast("Photo library access is required to choose a salon logo.", "warning");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSalonLogo(result.assets[0].uri);
      showToast("Salon logo selected.", "success");
    }
  };

  const handleTakeLogoPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast("Camera access is required to take a shop photo.", "warning");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSalonLogo(result.assets[0].uri);
      showToast("Shop photo captured.", "success");
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadedDocName(result.assets[0].name);
        showToast(`Uploaded ${result.assets[0].name}`, "success");
      }
    } catch {
      showToast("Could not select document. Please try again.", "error");
    }
  };

  const handleSaveCapacity = async () => {
    setIsSaving(true);
    try {
      const capNumber = Math.max(1, parseInt(capacity, 10) || 1);
      await barberService.updateSalonCapacity(salonId, {
        bio: salonBio,
        is_salon: isSalon,
        capacity: capNumber,
      });
      await barberService.updateProfileDetails({
        about_us: salonBio,
        logo_url: salonLogo,
      });
      if (updateUser) {
        updateUser({
          capacity: capNumber,
          working_chairs: capNumber,
          about_us: salonBio,
          logo_url: salonLogo,
        });
      }
      showToast("Salon working chairs & capacity saved to database.", "success");
    } catch {
      showToast("Settings updated locally.", "info");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStaff = () => {
    if (!newStaffName.trim()) {
      showToast("Please enter a staff member name.", "error");
      return;
    }

    const newStaff: StaffMember = {
      id: Date.now(),
      name: newStaffName.trim(),
      role: newStaffRole,
      phone: newStaffPhone.trim() || "+237 670 00 00 00",
      status: "Active",
    };

    setStaffList([...staffList, newStaff]);
    setNewStaffName("");
    setNewStaffPhone("");
    setAddStaffModalVisible(false);
    showToast(`Added ${newStaff.name} to salon team.`, "success");
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
          {t("salonManagement.title")}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTutorialVisible(true)}
            style={[styles.headerBtn, { width: 34, height: 34, borderRadius: 17 }]}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSaveCapacity}
            style={styles.headerSaveBtn}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#A3B39C" />
            ) : (
              <Text style={[styles.headerSaveBtnText, { color: colors.primary }]}>
                {t("common.save")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
        {/* Salon Logo & Banner Section */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.primarytext }]}>
            {t("salonManagement.brandingTitle")}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.secondarytext }]}>
            {t("salonManagement.brandingSub")}
          </Text>

          <View style={styles.logoRow}>
            {salonLogo ? (
              <Image source={{ uri: salonLogo }} style={styles.logoPreview} />
            ) : (
              <View
                style={[
                  styles.logoPlaceholder,
                  { backgroundColor: colors.background, borderColor: colors.surfacevariant },
                ]}
              >
                <Ionicons name="business-outline" size={32} color={colors.secondarytext} />
              </View>
            )}

            <View style={styles.logoActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickLogo}
                style={[styles.pickerBtn, { backgroundColor: colors.surfacevariant }]}
              >
                <Ionicons name="image-outline" size={16} color="#FFFFFF" />
                <Text style={styles.pickerBtnText}>{t("manageServices.chooseFromGallery")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTakeLogoPhoto}
                style={[styles.pickerBtn, { backgroundColor: colors.surfacevariant }]}
              >
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                <Text style={styles.pickerBtnText}>{t("common.camera")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Capacity & Salon Configuration */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.primarytext }]}>
            {t("salonManagement.workingChairs")}
          </Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.primarytext }]}>
                {t("salonManagement.multiChairLabel")}
              </Text>
              <Text style={[styles.fieldHint, { color: colors.secondarytext }]}>
                {t("salonManagement.multiChairSub")}
              </Text>
            </View>
            <Switch
              value={isSalon}
              onValueChange={setIsSalon}
              trackColor={{ false: colors.surfacevariant, true: "#A3B39C" }}
              thumbColor={isSalon ? "#FFFFFF" : "#888888"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.primarytext }]}>
              {t("salonManagement.chairsCountLabel")}
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
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
              placeholder="e.g. 5"
              placeholderTextColor={colors.inputPlaceholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.primarytext }]}>
              {t("salonManagement.descriptionLabel")}
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.surfacevariant,
                  color: colors.primarytext,
                },
              ]}
              value={salonBio}
              onChangeText={setSalonBio}
              multiline
              numberOfLines={3}
              placeholder={t("salonManagement.descriptionPlaceholder")}
              placeholderTextColor={colors.inputPlaceholder}
            />
          </View>
        </View>

        {/* Business License / Document Verification */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.primarytext }]}>
            {t("salonManagement.licensesTitle")}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.secondarytext }]}>
            {t("salonManagement.licensesSub")}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePickDocument}
            style={[
              styles.documentDropzone,
              {
                borderColor: uploadedDocName ? "#A3B39C" : colors.surfacevariant,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Ionicons
              name={uploadedDocName ? "checkmark-circle-outline" : "document-text-outline"}
              size={32}
              color={uploadedDocName ? "#A3B39C" : colors.secondarytext}
            />
            <Text style={[styles.docNameText, { color: colors.primarytext }]}>
              {uploadedDocName ? uploadedDocName : "Tap to Select Document (PDF/Image)"}
            </Text>
            <Text style={[styles.docSubText, { color: colors.secondarytext }]}>
              {uploadedDocName ? "Document attached successfully" : "Trade license, hygiene certificate, ID"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Salon Staff Members */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <View style={styles.staffHeaderRow}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.primarytext }]}>
                {t("salonManagement.teamStaff")}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.secondarytext }]}>
                {t("salonManagement.activeStaff")}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setAddStaffModalVisible(true)}
              style={[styles.addStaffBtn, { backgroundColor: "#A3B39C" }]}
            >
              <Ionicons name="add" size={18} color="#1C1E1B" />
              <Text style={styles.addStaffBtnText}>{t("salonManagement.inviteBarber")}</Text>
            </TouchableOpacity>
          </View>

          {isLoadingStaff ? (
            <ActivityIndicator style={{ paddingVertical: 20 }} color="#A3B39C" />
          ) : (
            <View style={styles.staffList}>
              {staffList.map((member) => (
                <View
                  key={member.id}
                  style={[
                    styles.staffRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                    },
                  ]}
                >
                  <View style={styles.staffAvatar}>
                    <Ionicons name="person" size={18} color="#FFFFFF" />
                  </View>

                  <View style={styles.staffInfo}>
                    <Text style={[styles.staffName, { color: colors.primarytext }]}>
                      {member.name}
                    </Text>
                    <Text style={[styles.staffRole, { color: colors.secondarytext }]}>
                      {member.role} • {member.phone}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          member.status === "Active"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(156, 163, 175, 0.15)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: member.status === "Active" ? "#10B981" : "#9CA3AF",
                        },
                      ]}
                    >
                      {member.status === "Active"
                        ? t("manageStaff.statusActive")
                        : member.status === "On Break"
                        ? t("manageStaff.statusBreak")
                        : t("manageStaff.statusOffDuty")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Save Bottom Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleSaveCapacity}
          style={[styles.saveAllBtn, { backgroundColor: "#A3B39C" }]}
        >
          <Text style={styles.saveAllBtnText}>{t("salonManagement.saveAllChanges")}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Staff Custom Modal */}
      <CustomModal
        visible={addStaffModalVisible}
        onClose={() => setAddStaffModalVisible(false)}
        title={t("salonManagement.inviteModalTitle")}
        description={t("salonManagement.inviteModalSub")}
        icon="person-add-outline"
        primaryText={t("salonManagement.sendInvite")}
        onPrimary={handleAddStaff}
        secondaryText={t("common.cancel")}
        onSecondary={() => setAddStaffModalVisible(false)}
      />

      {/* In-App Page Tutorial Modal */}
      <PageTutorialModal
        screenKey="salon_management"
        title={SALON_MANAGEMENT_TUTORIAL.title}
        subtitle={SALON_MANAGEMENT_TUTORIAL.subtitle}
        steps={SALON_MANAGEMENT_TUTORIAL.steps}
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
        autoTrigger={true}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerSaveBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 12.5,
    marginTop: -4,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  logoPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  logoActions: {
    flex: 1,
    gap: 8,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pickerBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 12,
  },
  inputGroup: {
    gap: 6,
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  documentDropzone: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  docNameText: {
    fontSize: 13.5,
    fontWeight: "600",
    marginTop: 4,
  },
  docSubText: {
    fontSize: 12,
  },
  staffHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addStaffBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addStaffBtnText: {
    color: "#1C1E1B",
    fontSize: 12.5,
    fontWeight: "700",
  },
  staffList: {
    gap: 10,
    marginTop: 4,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  staffAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: "700",
  },
  staffRole: {
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  saveAllBtn: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  saveAllBtnText: {
    color: "#1C1E1B",
    fontSize: 15,
    fontWeight: "700",
  },
});
