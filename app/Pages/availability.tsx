import { availabilityService } from "@/services/availabilityService";
import { barberService } from "@/services/barberService";
import { useAuth } from "@/context/AuthContext";
import { CustomModal } from "@/components/ui/CustomModal";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { FontFamily } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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

interface DaySlot {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string;
}

interface EditingTimeState {
  dayIndex: number;
  field: "open" | "close";
}

const INITIAL_SCHEDULE: DaySlot[] = [
  { day: "Monday", enabled: true, open: "09:00", close: "18:00" },
  { day: "Tuesday", enabled: true, open: "09:00", close: "18:00" },
  { day: "Wednesday", enabled: true, open: "09:00", close: "18:00" },
  { day: "Thursday", enabled: true, open: "09:00", close: "18:00" },
  { day: "Friday", enabled: true, open: "09:00", close: "19:00" },
  { day: "Saturday", enabled: true, open: "08:30", close: "19:00" },
  { day: "Sunday", enabled: false, open: "10:00", close: "16:00" },
];

const BUFFER_OPTIONS = ["0 min", "15 min", "30 min", "45 min"];

const TIME_OPTIONS = [
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
];

function formatTime12h(time24: string): string {
  if (!time24) return "9:00 AM";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

const DAY_NAMES_FR: Record<string, string> = {
  Monday: "Lundi",
  Tuesday: "Mardi",
  Wednesday: "Mercredi",
  Thursday: "Jeudi",
  Friday: "Vendredi",
  Saturday: "Samedi",
  Sunday: "Dimanche",
};

export default function BarberAvailabilityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ staffId?: string }>();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const isSalon = Boolean(user?.role === "salon" || user?.is_manager || user?.is_lead);
  const isStaff = Boolean(user?.parent_salon_id && !isSalon);

  // Staff selection state (for salon managers)
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(
    params.staffId ? Number(params.staffId) : null
  );
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isInheritedFromSalon, setIsInheritedFromSalon] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const [schedule, setSchedule] = useState<DaySlot[]>(INITIAL_SCHEDULE);
  const [selectedBuffer, setSelectedBuffer] = useState<string>("15 min");
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Time editing modal state
  const [editingTimeSlot, setEditingTimeSlot] = useState<EditingTimeState | null>(null);

  // Blocked dates state (synced with backend database)
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");

  // Load staff list if salon
  const fetchStaffList = useCallback(async () => {
    if (!isSalon) return;
    try {
      const salonId = user?.id || 4;
      const res = await barberService.listSalonStaff(salonId);
      const list = Array.isArray(res) ? res : (res as any)?.staff || [];
      setStaffList(list);
    } catch {
      setStaffList([]);
    }
  }, [isSalon, user?.id]);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  // Load schedule for current target (salon or selected staff)
  const fetchSchedule = useCallback(async () => {
    try {
      let windows: any[] = [];
      let isInherited = false;

      let resObj: any = null;
      if (isSalon && selectedStaffId) {
        const res: any = await availabilityService.getBarberAvailability(selectedStaffId);
        resObj = res;
        if (Array.isArray(res)) {
          windows = res;
        } else if (res && typeof res === "object") {
          windows = res.availability || [];
          isInherited = Boolean(res.is_inherited_from_salon);
        }
      } else {
        const res: any = await availabilityService.getMyAvailability();
        resObj = res;
        if (Array.isArray(res)) {
          windows = res;
        } else if (res && typeof res === "object") {
          windows = res.availability || [];
        }
        isInherited = false;
      }

      if (resObj && typeof resObj === "object" && !Array.isArray(resObj)) {
        if (typeof resObj.buffer_minutes === "number") {
          setSelectedBuffer(`${resObj.buffer_minutes} min`);
        }
        if (Array.isArray(resObj.blocked_dates)) {
          setBlockedDates(
            resObj.blocked_dates.map((b: any, i: number) => ({
              id: String(b.id || i + 1),
              date: b.date || b.iso_date || "",
              reason: b.reason || "Unavailable / Personal Time",
            }))
          );
        }
      }

      setIsInheritedFromSalon(isInherited);

      if (Array.isArray(windows) && windows.length > 0) {
        setSchedule(
          INITIAL_SCHEDULE.map((daySlot, index) => {
            const win = windows.find(
              (w: any) => w.day_of_week === index && !w.is_blocked
            );
            if (win) {
              const openClean = win.start_time.slice(0, 5);
              const closeClean = win.end_time.slice(0, 5);
              return {
                ...daySlot,
                enabled: true,
                open: openClean,
                close: closeClean,
              };
            }
            return { ...daySlot, enabled: false };
          })
        );
      } else {
        setSchedule(INITIAL_SCHEDULE);
      }
    } catch {
      // Fallback
    }
  }, [isSalon, selectedStaffId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSchedule();
    if (isSalon) await fetchStaffList();
    setRefreshing(false);
    showToast(
      language === "fr"
        ? "Horaires de travail actualisés."
        : "Working hours refreshed.",
      "info"
    );
  }, [fetchSchedule, fetchStaffList, isSalon, showToast, language]);

  const toggleDay = (index: number) => {
    if (isStaff) return;
    const updated = [...schedule];
    updated[index].enabled = !updated[index].enabled;
    setSchedule(updated);
  };

  const setSlotTime = (dayIndex: number, field: "open" | "close", time: string) => {
    if (isStaff) return;
    const updated = [...schedule];
    updated[dayIndex][field] = time;
    setSchedule(updated);
    setEditingTimeSlot(null);
  };

  const applyPresetHours = (open: string, close: string, label: string) => {
    if (isStaff) return;
    setSchedule((prev) =>
      prev.map((slot) => ({
        ...slot,
        open,
        close,
      }))
    );
    showToast(
      language === "fr"
        ? `Appliqué ${label} (${formatTime12h(open)} - ${formatTime12h(close)}) à tous les jours.`
        : `Applied ${label} (${formatTime12h(open)} - ${formatTime12h(close)}) to all days.`,
      "success"
    );
  };

  const removeBlockedDate = (id: string) => {
    if (isStaff) return;
    setBlockedDates(blockedDates.filter((b) => b.id !== id));
    showToast(
      language === "fr"
        ? "Date bloquée retirée du calendrier."
        : "Blocked date removed from calendar.",
      "info"
    );
  };

  const handleAddBlockedDate = () => {
    if (isStaff) return;
    if (!newBlockDate.trim()) {
      showToast(
        language === "fr"
          ? "Veuillez entrer une date (ex. 25 déc.)."
          : "Please enter a date (e.g. Dec 25).",
        "warning"
      );
      return;
    }
    const newBlock: BlockedDate = {
      id: Date.now().toString(),
      date: newBlockDate.trim(),
      reason: newBlockReason.trim() || (language === "fr" ? "Indisponible / Temps personnel" : "Unavailable / Personal Time"),
    };
    setBlockedDates([...blockedDates, newBlock]);
    setNewBlockDate("");
    setNewBlockReason("");
    setBlockModalVisible(false);
    showToast(
      language === "fr"
        ? `${newBlock.date} marquée comme bloquée.`
        : `${newBlock.date} marked as blocked.`,
      "success"
    );
  };

  const handleSave = async () => {
    if (isStaff) {
      showToast(
        language === "fr"
          ? "Seul le gérant ou coiffeur principal peut modifier les horaires."
          : "Only the salon manager or lead stylist can modify working hours.",
        "warning"
      );
      return;
    }

    setIsSaving(true);
    try {
      const daysPayload = schedule.map((slot, index) => ({
        day_of_week: index,
        enabled: slot.enabled,
        start_time: slot.open.length === 5 ? `${slot.open}:00` : slot.open,
        end_time: slot.close.length === 5 ? `${slot.close}:00` : slot.close,
      }));

      const parsedBuffer = parseInt(selectedBuffer.replace(/[^0-9]/g, ""), 10);
      const bufferMins = isNaN(parsedBuffer) ? 15 : parsedBuffer;
      await availabilityService.setWeeklySchedule(
        daysPayload,
        selectedStaffId || undefined,
        false,
        bufferMins,
        blockedDates
      );

      const currentStaff = selectedStaffId ? staffList.find((s) => s.id === selectedStaffId) : null;
      const successMsg = selectedStaffId
        ? (language === "fr"
            ? `Horaires de travail pour ${currentStaff?.name || "l'employé"} enregistrés avec succès.`
            : `On-duty working hours for ${currentStaff?.name || "staff"} saved successfully.`)
        : (t("availability.savedSuccess") || "Salon opening hours and schedule saved successfully.");

      showToast(successMsg, "success");
      if (selectedStaffId) {
        setIsInheritedFromSalon(false);
      }
      router.back();
    } catch (e: any) {
      showToast(e?.message || t("availability.saveError") || "Schedule updated locally.", "info");
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToSalonSchedule = async () => {
    if (!selectedStaffId) return;
    setIsResetting(true);
    try {
      await availabilityService.resetStaffToSalonSchedule(selectedStaffId);
      showToast(
        language === "fr"
          ? "Horaires réinitialisés aux heures d'ouverture du salon."
          : "Reset to salon opening hours successfully.",
        "success"
      );
      await fetchSchedule();
    } catch (e: any) {
      showToast(e?.message || "Failed to reset to salon hours.", "error");
    } finally {
      setIsResetting(false);
    }
  };

  const activeDaysCount = schedule.filter((s) => s.enabled).length;

  const totalWeeklyHours = useMemo(() => {
    let total = 0;
    schedule.forEach((s) => {
      if (s.enabled) {
        const [oH, oM] = s.open.split(":").map(Number);
        const [cH, cM] = s.close.split(":").map(Number);
        const diff = (cH + cM / 60) - (oH + oM / 60);
        if (diff > 0) total += diff;
      }
    });
    return Math.round(total);
  }, [schedule]);

  const currentSelectedStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return staffList.find((s) => s.id === selectedStaffId);
  }, [selectedStaffId, staffList]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Screen Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[
            styles.headerCircleBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primarytext} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]} numberOfLines={1}>
            {selectedStaffId && currentSelectedStaff
              ? (language === "fr" ? `Horaires: ${currentSelectedStaff.name}` : `${currentSelectedStaff.name}'s Hours`)
              : (language === "fr" ? "Horaires d'ouverture Salon" : t("availability.scheduleAndHours"))}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]} numberOfLines={1}>
            {selectedStaffId
              ? (isInheritedFromSalon
                  ? (language === "fr" ? "Hérite des heures du salon" : "Inherits Salon Hours")
                  : (language === "fr" ? "Horaires de garde personnalisés" : "Custom On-Duty Shift"))
              : (t("availability.daysActiveSummary", { active: activeDaysCount, hours: totalWeeklyHours }) || `${activeDaysCount} of 7 days active • ${totalWeeklyHours} hrs weekly`)}
          </Text>
        </View>

        {isStaff ? (
          <View
            style={[
              styles.lockedBadge,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="lock-closed" size={13} color={colors.secondarytext} />
            <Text style={[styles.lockedBadgeText, { color: colors.secondarytext }]}>
              {language === "fr" ? "Verrouillé" : "Locked"}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSaving}
            onPress={handleSave}
            style={[styles.headerSaveBtn, { backgroundColor: colors.primary }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color={colors.onBrand} />
                <Text style={[styles.headerSaveText, { color: colors.onBrand }]}>{t("availability.save")}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Salon Manager Staff Selector Strip */}
        {isSalon && staffList.length > 0 && (
          <View style={styles.staffTabsContainer}>
            <Text style={[styles.staffTabsLabel, { color: colors.secondarytext }]}>
              {language === "fr" ? "Gérer les horaires pour :" : "Configure schedule for:"}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.staffTabsScroll}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedStaffId(null)}
                style={[
                  styles.staffTabChip,
                  selectedStaffId === null
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="business"
                  size={14}
                  color={selectedStaffId === null ? colors.onBrand : colors.primary}
                />
                <Text
                  style={[
                    styles.staffTabChipText,
                    {
                      color: selectedStaffId === null ? colors.onBrand : colors.primarytext,
                      fontWeight: selectedStaffId === null ? "700" : "500",
                    },
                  ]}
                >
                  {language === "fr" ? "Horaires Salon" : "Salon Hours"}
                </Text>
              </TouchableOpacity>

              {staffList.map((member) => {
                const isSelected = selectedStaffId === member.id;
                return (
                  <TouchableOpacity
                    key={member.id}
                    activeOpacity={0.85}
                    onPress={() => setSelectedStaffId(member.id)}
                    style={[
                      styles.staffTabChip,
                      isSelected
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={13}
                      color={isSelected ? colors.onBrand : colors.secondarytext}
                    />
                    <Text
                      style={[
                        styles.staffTabChipText,
                        {
                          color: isSelected ? colors.onBrand : colors.primarytext,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Staff Inheritance or Custom Status Banner (when viewing individual staff) */}
        {isSalon && selectedStaffId && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: isInheritedFromSalon
                  ? "rgba(199, 243, 107, 0.12)"
                  : "rgba(59, 130, 246, 0.12)",
                borderColor: isInheritedFromSalon ? colors.primary : "#3B82F6",
              },
            ]}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons
                  name={isInheritedFromSalon ? "link-outline" : "calendar-outline"}
                  size={16}
                  color={isInheritedFromSalon ? colors.primary : "#3B82F6"}
                />
                <Text
                  style={[
                    styles.statusBannerTitle,
                    { color: colors.primarytext },
                  ]}
                >
                  {isInheritedFromSalon
                    ? (language === "fr"
                        ? "Hérite des horaires du salon"
                        : "Inheriting Salon Opening Hours")
                    : (language === "fr"
                        ? "Horaires personnalisés actifs"
                        : "Custom On-Duty Shift Active")}
                </Text>
              </View>
              <Text style={[styles.statusBannerSub, { color: colors.secondarytext }]}>
                {isInheritedFromSalon
                  ? (language === "fr"
                      ? "Ce coiffeur est de garde aux horaires généraux du salon. Ajustez ci-dessous pour lui assigner un créneau individuel."
                      : "This stylist works during salon opening hours. Adjust hours below to set a custom on-duty shift.")
                  : (language === "fr"
                      ? "Ce coiffeur a des horaires de garde distincts configurés par le salon."
                      : "This stylist has an individual shift configured by the salon manager.")}
              </Text>
            </View>

            {!isInheritedFromSalon && (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isResetting}
                onPress={handleResetToSalonSchedule}
                style={[
                  styles.resetBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {isResetting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={13} color={colors.primary} />
                    <Text style={[styles.resetBtnText, { color: colors.primary }]}>
                      {language === "fr" ? "Réinitialiser" : "Reset to Salon"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Read-only banner for sub-barbers */}
        {isStaff && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: "rgba(245, 158, 11, 0.12)",
                borderColor: "#F59E0B",
              },
            ]}
          >
            <Ionicons name="lock-closed" size={18} color="#F59E0B" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.statusBannerTitle, { color: colors.primarytext }]}>
                {language === "fr"
                  ? "Géré par la direction du salon"
                  : "Managed by Salon Management"}
              </Text>
              <Text style={[styles.statusBannerSub, { color: colors.secondarytext }]}>
                {language === "fr"
                  ? "Vos horaires de présence (on duty) sont configurés par votre gérant ou coiffeur principal."
                  : "Your on-duty working hours are determined by your salon manager or lead stylist."}
              </Text>
            </View>
          </View>
        )}

        {/* Telemetry Summary Command Card */}
        <View
          style={[
            styles.telemetryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primary }]}>
                {activeDaysCount} / 7
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>{t("availability.activeDays")}</Text>
            </View>

            <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primarytext }]}>
                {totalWeeklyHours}h
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>{t("availability.totalHours")}</Text>
            </View>

            <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primary }]}>
                {selectedBuffer}
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>{t("availability.prepBuffer")}</Text>
            </View>

            <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primarytext }]}>
                {blockedDates.length}
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
                {t("availability.blockedDays") || "Blocked Days"}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Shift Presets (Only for Salon Managers) */}
        {!isStaff && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
                {t("availability.quickPresets") || "Quick Shift Presets"}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.secondarytext }]}>
                {t("availability.quickPresetsSub") || "Apply standard hours across all open days"}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsRow}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => applyPresetHours("09:00", "18:00", "Standard")}
                style={[
                  styles.presetChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="flash-outline" size={13} color={colors.primary} />
                <Text style={[styles.presetChipText, { color: colors.primarytext }]}>
                  {t("availability.presetStandard") || "Standard (9 AM - 6 PM)"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => applyPresetHours("08:00", "17:00", "Early Bird")}
                style={[
                  styles.presetChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="sunny-outline" size={13} color={colors.primary} />
                <Text style={[styles.presetChipText, { color: colors.primarytext }]}>
                  {t("availability.presetEarly") || "Early Bird (8 AM - 5 PM)"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => applyPresetHours("10:00", "20:00", "Evening Shift")}
                style={[
                  styles.presetChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="moon-outline" size={13} color={colors.primary} />
                <Text style={[styles.presetChipText, { color: colors.primarytext }]}>
                  {t("availability.presetEvening") || "Evening (10 AM - 8 PM)"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => applyPresetHours("08:00", "20:00", "Full Day")}
                style={[
                  styles.presetChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="time-outline" size={13} color={colors.primary} />
                <Text style={[styles.presetChipText, { color: colors.primarytext }]}>
                  {t("availability.presetFullDay") || "Full Day (8 AM - 8 PM)"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* 7-Day Schedule Matrix */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              {selectedStaffId && currentSelectedStaff
                ? (language === "fr" ? `Horaires de garde de ${currentSelectedStaff.name}` : `${currentSelectedStaff.name}'s Weekly On-Duty Shift`)
                : (t("availability.weeklyScheduleTitle") || "Weekly Operating Schedule")}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondarytext }]}>
              {isStaff
                ? (language === "fr" ? "Affichage de vos horaires de présence actuels" : "Your current on-duty timetable")
                : (t("availability.weeklyScheduleSub") || "Toggle open days and tap opening / closing time to adjust")}
            </Text>
          </View>

          <View
            style={[
              styles.cardGroup,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {schedule.map((slot, index) => (
              <View
                key={slot.day}
                style={[
                  styles.dayRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.dayCol}>
                  <View style={styles.dayHeaderLine}>
                    <View
                      style={[
                        styles.dayDot,
                        {
                          backgroundColor: slot.enabled ? colors.primary : colors.secondarytext,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dayName,
                        {
                          color: slot.enabled ? colors.primarytext : colors.secondarytext,
                          fontWeight: slot.enabled ? "700" : "500",
                        },
                      ]}
                    >
                      {language === "fr" ? (DAY_NAMES_FR[slot.day] || slot.day) : slot.day}
                    </Text>
                    {!slot.enabled && (
                      <View
                        style={[
                          styles.closedBadge,
                          {
                            backgroundColor: "rgba(239, 68, 68, 0.12)",
                            borderColor: "rgba(239, 68, 68, 0.3)",
                          },
                        ]}
                      >
                        <Text style={styles.closedBadgeText}>{t("availability.closed") || "Closed"}</Text>
                      </View>
                    )}
                  </View>

                  {slot.enabled ? (
                    <View style={styles.timeControlsRow}>
                      <TouchableOpacity
                        disabled={isStaff}
                        activeOpacity={0.75}
                        onPress={() =>
                          setEditingTimeSlot({ dayIndex: index, field: "open" })
                        }
                        style={[
                          styles.timePillBtn,
                          { backgroundColor: colors.background, borderColor: colors.border },
                          isStaff && { opacity: 0.9 },
                        ]}
                      >
                        <Ionicons name="time-outline" size={13} color={colors.primary} />
                        <Text style={[styles.timePillText, { color: colors.primarytext }]}>
                          {formatTime12h(slot.open)}
                        </Text>
                        {!isStaff && (
                          <Ionicons name="chevron-down" size={11} color={colors.secondarytext} />
                        )}
                      </TouchableOpacity>

                      <Text style={[styles.timeBetweenText, { color: colors.secondarytext }]}>
                        {t("availability.to") || "to"}
                      </Text>

                      <TouchableOpacity
                        disabled={isStaff}
                        activeOpacity={0.75}
                        onPress={() =>
                          setEditingTimeSlot({ dayIndex: index, field: "close" })
                        }
                        style={[
                          styles.timePillBtn,
                          { backgroundColor: colors.background, borderColor: colors.border },
                          isStaff && { opacity: 0.9 },
                        ]}
                      >
                        <Ionicons name="time-outline" size={13} color={colors.primary} />
                        <Text style={[styles.timePillText, { color: colors.primarytext }]}>
                          {formatTime12h(slot.close)}
                        </Text>
                        {!isStaff && (
                          <Ionicons name="chevron-down" size={11} color={colors.secondarytext} />
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={[styles.dayHoursOff, { color: colors.secondarytext }]}>
                      {t("availability.noAppointmentsOnDay") || "No appointments accepted on this day"}
                    </Text>
                  )}
                </View>

                {/* Day Active Switch */}
                <Switch
                  disabled={isStaff}
                  value={slot.enabled}
                  onValueChange={() => toggleDay(index)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={isDark ? colors.background : "#FFFFFF"}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Preparation Buffer Time */}
        {!isStaff && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
                {t("availability.bookingBufferTitle") || "Booking Buffer Time"}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.secondarytext }]}>
                {t("availability.bookingBufferSub") || "Automatic rest / sanitization buffer added between appointments"}
              </Text>
            </View>

            <View style={styles.bufferPillsRow}>
              {BUFFER_OPTIONS.map((buf) => {
                const isSelected = selectedBuffer === buf;
                return (
                  <TouchableOpacity
                    key={buf}
                    activeOpacity={0.8}
                    onPress={() => setSelectedBuffer(buf)}
                    style={[
                      styles.bufferPill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="hourglass-outline"
                      size={14}
                      color={isSelected ? colors.onBrand : colors.primary}
                    />
                    <Text
                      style={[
                        styles.bufferPillText,
                        { color: isSelected ? colors.onBrand : colors.primarytext },
                      ]}
                    >
                      {buf}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Blocked Dates & Holidays Manager */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRowWithBtn}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
                {t("availability.blockedDatesTitle") || "Blocked Dates & Holidays"}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.secondarytext }]}>
                {t("availability.blockedDatesSub") || "Dates when appointments cannot be scheduled"}
              </Text>
            </View>

            {!isStaff && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setBlockModalVisible(true)}
                style={[
                  styles.addBlockBtn,
                  {
                    backgroundColor: "rgba(199, 243, 107, 0.12)",
                    borderColor: "rgba(199, 243, 107, 0.3)",
                  },
                ]}
              >
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={[styles.addBlockBtnText, { color: colors.primary }]}>
                  {t("availability.blockDateBtn") || "Block Date"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {blockedDates.length === 0 ? (
            <View
              style={[
                styles.emptyBlockedCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="calendar-outline" size={32} color={colors.secondarytext} />
              <Text style={[styles.emptyBlockedText, { color: colors.secondarytext }]}>
                {t("availability.noBlockedDates") || "No blocked dates or holidays configured."}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {blockedDates.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.blockedDateItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.blockedDateTitle, { color: colors.primarytext }]}>
                      {item.date}
                    </Text>
                    <Text style={[styles.blockedDateReason, { color: colors.secondarytext }]}>
                      {item.reason}
                    </Text>
                  </View>

                  {!isStaff && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => removeBlockedDate(item.id)}
                      style={[
                        styles.removeBlockBtn,
                        {
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.25)",
                        },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Big Bottom Save CTA (Only for Managers) */}
        {!isStaff && (
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={isSaving}
            onPress={handleSave}
            style={[styles.primarySaveCTA, { backgroundColor: colors.primary }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={19} color={colors.onBrand} />
                <Text style={[styles.primarySaveCTAText, { color: colors.onBrand }]}>
                  {selectedStaffId && currentSelectedStaff
                    ? (language === "fr" ? `Enregistrer pour ${currentSelectedStaff.name}` : `Save Shifts for ${currentSelectedStaff.name}`)
                    : (t("availability.saveScheduleChanges") || "Save Schedule Changes")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={editingTimeSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingTimeSlot(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <View
            style={[
              styles.timePickerCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.timePickerHeader}>
              <Text style={[styles.timePickerTitle, { color: colors.primarytext }]}>
                {editingTimeSlot?.field === "open"
                  ? (language === "fr" ? "Heure d'ouverture" : "Opening Time")
                  : (language === "fr" ? "Heure de fermeture" : "Closing Time")}
              </Text>
              {editingTimeSlot !== null && (
                <Text style={[styles.timePickerSub, { color: colors.secondarytext }]}>
                  {language === "fr"
                    ? DAY_NAMES_FR[schedule[editingTimeSlot.dayIndex]?.day] || schedule[editingTimeSlot.dayIndex]?.day
                    : schedule[editingTimeSlot.dayIndex]?.day}
                </Text>
              )}
            </View>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <View style={styles.timeOptionsGrid}>
                {TIME_OPTIONS.map((timeStr) => {
                  const isCurrent =
                    editingTimeSlot &&
                    schedule[editingTimeSlot.dayIndex]?.[editingTimeSlot.field] === timeStr;
                  return (
                    <TouchableOpacity
                      key={timeStr}
                      activeOpacity={0.75}
                      onPress={() => {
                        if (editingTimeSlot) {
                          setSlotTime(
                            editingTimeSlot.dayIndex,
                            editingTimeSlot.field,
                            timeStr
                          );
                        }
                      }}
                      style={[
                        styles.timeOptionChip,
                        isCurrent
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeOptionChipText,
                          {
                            color: isCurrent ? colors.onBrand : colors.primarytext,
                            fontWeight: isCurrent ? "700" : "500",
                          },
                        ]}
                      >
                        {formatTime12h(timeStr)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setEditingTimeSlot(null)}
              style={[
                styles.confirmBlockBtn,
                { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.confirmBlockBtnText, { color: colors.primarytext }]}>
                {language === "fr" ? "Fermer" : "Cancel"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Block Date Custom Modal */}
      <CustomModal
        visible={blockModalVisible}
        onClose={() => setBlockModalVisible(false)}
        title={t("availability.blockDateModalTitle") || "Block Date / Holiday"}
        description={
          language === "fr"
            ? "Empêchez les clients de prendre des rendez-vous à cette date spécifique."
            : "Prevent clients from booking appointments on this specific day."
        }
        primaryText={t("availability.confirmBlockDate") || "Block Date"}
        onPrimary={handleAddBlockedDate}
      >
        <View style={styles.blockModalBody}>
          <Text style={[styles.inputLabel, { color: colors.primarytext }]}>
            {language === "fr" ? "Date" : "Date"}
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.primarytext,
              },
            ]}
            placeholder={language === "fr" ? "ex. 25 déc., 1er janv." : "e.g. Dec 25, Jan 1"}
            placeholderTextColor={colors.secondarytext}
            value={newBlockDate}
            onChangeText={setNewBlockDate}
          />

          <Text style={[styles.inputLabel, { color: colors.primarytext, marginTop: 8 }]}>
            {language === "fr" ? "Raison (facultatif)" : "Reason (optional)"}
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.primarytext,
              },
            ]}
            placeholder={
              language === "fr"
                ? "ex. Férié, Rénovations, Événement privé"
                : "e.g. Public Holiday, Renovation, Private Event"
            }
            placeholderTextColor={colors.secondarytext}
            value={newBlockReason}
            onChangeText={setNewBlockReason}
          />
        </View>
      </CustomModal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  headerSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  headerSaveText: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  lockedBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  staffTabsContainer: {
    gap: 8,
  },
  staffTabsLabel: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  staffTabsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  staffTabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  staffTabChipText: {
    fontSize: 12.5,
    fontFamily: FontFamily.semibold,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  statusBannerTitle: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  statusBannerSub: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    lineHeight: 16,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  telemetryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  telemetryGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  telemetryCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 32,
  },
  telemetryValue: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  telemetryLabel: {
    fontSize: 10.5,
    fontFamily: FontFamily.regular,
    textAlign: "center",
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeaderRow: {
    gap: 2,
  },
  sectionHeaderRowWithBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 1,
  },
  presetsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11.5,
    fontFamily: FontFamily.semibold,
  },
  cardGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  dayCol: {
    flex: 1,
    gap: 6,
    paddingRight: 12,
  },
  dayHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayName: {
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
  },
  closedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  closedBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    color: "#EF4444",
  },
  timeControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timePillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  timePillText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  timeBetweenText: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
  },
  dayHoursOff: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
  },
  bufferPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  bufferPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  bufferPillText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  addBlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  addBlockBtnText: {
    fontSize: 11.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  emptyBlockedCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  emptyBlockedText: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    lineHeight: 16,
  },
  blockedDateItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  blockedDateTitle: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  blockedDateReason: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
  },
  removeBlockBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primarySaveCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 4,
  },
  primarySaveCTAText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  timePickerCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  timePickerHeader: {
    marginBottom: 4,
  },
  timePickerTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  timePickerSub: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  timeOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeOptionChip: {
    width: "31%",
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeOptionChipText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
  },
  blockModalBody: {
    paddingVertical: 6,
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  modalInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  confirmBlockBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBlockBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
});
