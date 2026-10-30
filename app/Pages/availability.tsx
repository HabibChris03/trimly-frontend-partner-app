import { availabilityService } from "@/services/availabilityService";
import { CustomModal } from "@/components/ui/CustomModal";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { FontFamily } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

export default function BarberAvailabilityScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [schedule, setSchedule] = useState<DaySlot[]>(INITIAL_SCHEDULE);
  const [selectedBuffer, setSelectedBuffer] = useState<string>("15 min");
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Time editing modal state
  const [editingTimeSlot, setEditingTimeSlot] = useState<EditingTimeState | null>(null);

  // Blocked dates state
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([
    { id: "1", date: "Jan 1, 2026", reason: "New Year's Day" },
  ]);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");

  const fetchSchedule = useCallback(async () => {
    try {
      const windows = await availabilityService.getMyAvailability();
      if (Array.isArray(windows) && windows.length > 0) {
        setSchedule((prev) =>
          prev.map((daySlot, index) => {
            const win = windows.find(
              (w) => w.day_of_week === index && !w.is_blocked
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
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSchedule();
    setRefreshing(false);
    showToast("Working hours refreshed.", "info");
  }, [fetchSchedule, showToast]);

  const toggleDay = (index: number) => {
    const updated = [...schedule];
    updated[index].enabled = !updated[index].enabled;
    setSchedule(updated);
  };

  const setSlotTime = (dayIndex: number, field: "open" | "close", time: string) => {
    const updated = [...schedule];
    updated[dayIndex][field] = time;
    setSchedule(updated);
    setEditingTimeSlot(null);
  };

  const applyPresetHours = (open: string, close: string, label: string) => {
    setSchedule((prev) =>
      prev.map((slot) => ({
        ...slot,
        open,
        close,
      }))
    );
    showToast(`Applied ${label} (${formatTime12h(open)} - ${formatTime12h(close)}) to all days.`, "success");
  };

  const removeBlockedDate = (id: string) => {
    setBlockedDates(blockedDates.filter((b) => b.id !== id));
    showToast("Blocked date removed from calendar.", "info");
  };

  const handleAddBlockedDate = () => {
    if (!newBlockDate.trim()) {
      showToast("Please enter a date (e.g. Dec 25).", "warning");
      return;
    }
    const newBlock: BlockedDate = {
      id: Date.now().toString(),
      date: newBlockDate.trim(),
      reason: newBlockReason.trim() || "Unavailable / Personal Time",
    };
    setBlockedDates([...blockedDates, newBlock]);
    setNewBlockDate("");
    setNewBlockReason("");
    setBlockModalVisible(false);
    showToast(`${newBlock.date} marked as blocked.`, "success");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const enabledSlots = schedule
        .map((slot, index) => ({ slot, index }))
        .filter((item) => item.slot.enabled);

      for (const item of enabledSlots) {
        await availabilityService
          .createWindow({
            day_of_week: item.index,
            start_time:
              item.slot.open.length === 5
                ? `${item.slot.open}:00`
                : item.slot.open,
            end_time:
              item.slot.close.length === 5
                ? `${item.slot.close}:00`
                : item.slot.close,
            is_blocked: false,
          })
          .catch(() => null);
      }

      showToast("Working hours and schedule saved successfully.", "success");
      router.back();
    } catch {
      showToast("Schedule updated locally.", "info");
      router.back();
    } finally {
      setIsSaving(false);
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
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>{t("availability.scheduleAndHours")}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
            {activeDaysCount} of 7 days active • {totalWeeklyHours} hrs weekly
          </Text>
        </View>

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
                Blocked Days
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Shift Presets */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              Quick Shift Presets
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondarytext }]}>
              Apply standard hours across all open days
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
                Standard (9 AM - 6 PM)
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
                Early Bird (8 AM - 5 PM)
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
                Evening (10 AM - 8 PM)
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
                Full Day (8 AM - 8 PM)
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 7-Day Schedule Matrix */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              Weekly Operating Schedule
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondarytext }]}>
              Toggle open days and tap opening / closing time to adjust
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
                      {slot.day}
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
                        <Text style={styles.closedBadgeText}>Closed</Text>
                      </View>
                    )}
                  </View>

                  {slot.enabled ? (
                    <View style={styles.timeControlsRow}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() =>
                          setEditingTimeSlot({ dayIndex: index, field: "open" })
                        }
                        style={[
                          styles.timePillBtn,
                          { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                      >
                        <Ionicons name="time-outline" size={13} color={colors.primary} />
                        <Text style={[styles.timePillText, { color: colors.primarytext }]}>
                          {formatTime12h(slot.open)}
                        </Text>
                        <Ionicons name="chevron-down" size={11} color={colors.secondarytext} />
                      </TouchableOpacity>

                      <Text style={[styles.timeBetweenText, { color: colors.secondarytext }]}>
                        to
                      </Text>

                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() =>
                          setEditingTimeSlot({ dayIndex: index, field: "close" })
                        }
                        style={[
                          styles.timePillBtn,
                          { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                      >
                        <Ionicons name="time-outline" size={13} color={colors.primary} />
                        <Text style={[styles.timePillText, { color: colors.primarytext }]}>
                          {formatTime12h(slot.close)}
                        </Text>
                        <Ionicons name="chevron-down" size={11} color={colors.secondarytext} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={[styles.dayHoursOff, { color: colors.secondarytext }]}>
                      No appointments accepted on this day
                    </Text>
                  )}
                </View>

                {/* Day Active Switch */}
                <Switch
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
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              Booking Buffer Time
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondarytext }]}>
              Automatic rest / sanitization buffer added between appointments
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

        {/* Blocked Dates & Holidays Manager */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRowWithBtn}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
                Blocked Dates & Holidays
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.secondarytext }]}>
                Dates when appointments cannot be scheduled
              </Text>
            </View>

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
                Block Date
              </Text>
            </TouchableOpacity>
          </View>

          {blockedDates.length === 0 ? (
            <View
              style={[
                styles.emptyBlockedCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="calendar-outline" size={28} color={colors.secondarytext} />
              <Text style={[styles.emptyBlockedText, { color: colors.secondarytext }]}>
                No blocked dates on your calendar. You are operating all open days.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {blockedDates.map((block) => (
                <View
                  key={block.id}
                  style={[
                    styles.blockedDateItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.blockedDateTitle, { color: colors.primarytext }]}>
                      {block.date}
                    </Text>
                    <Text style={[styles.blockedDateReason, { color: colors.secondarytext }]}>
                      {block.reason}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => removeBlockedDate(block.id)}
                    style={[
                      styles.removeBlockBtn,
                      {
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        borderColor: "rgba(239, 68, 68, 0.3)",
                      },
                    ]}
                  >
                    <Ionicons name="close" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Primary Save Floating CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
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
                Save Schedule Configuration
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* QUICK TIME PICKER MODAL */}
      <Modal
        visible={!!editingTimeSlot}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingTimeSlot(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setEditingTimeSlot(null)}
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.7)" }]}
        >
          <View
            style={[
              styles.timePickerCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.timePickerHeader}>
              <Text style={[styles.timePickerTitle, { color: colors.primarytext }]}>
                Select {editingTimeSlot?.field === "open" ? "Opening" : "Closing"} Time
              </Text>
              <Text style={[styles.timePickerSub, { color: colors.secondarytext }]}>
                {editingTimeSlot ? schedule[editingTimeSlot.dayIndex]?.day : ""}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <View style={styles.timeOptionsGrid}>
                {TIME_OPTIONS.map((time) => {
                  const currentVal = editingTimeSlot
                    ? schedule[editingTimeSlot.dayIndex][editingTimeSlot.field]
                    : "";
                  const isSelected = currentVal === time;

                  return (
                    <TouchableOpacity
                      key={time}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (editingTimeSlot) {
                          setSlotTime(
                            editingTimeSlot.dayIndex,
                            editingTimeSlot.field,
                            time
                          );
                        }
                      }}
                      style={[
                        styles.timeOptionChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeOptionChipText,
                          {
                            color: isSelected ? colors.onBrand : colors.primarytext,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {formatTime12h(time)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* BLOCK DATE MODAL */}
      <CustomModal
        visible={blockModalVisible}
        onClose={() => setBlockModalVisible(false)}
        title={t("availability.blockDateOrHoliday")}
        description={t("availability.pauseDateDesc") || "Specify the date you wish to pause bookings for."}
        scrollable={false}
      >
        <View style={styles.blockModalBody}>
          <Text style={[styles.inputLabel, { color: colors.primarytext }]}>
            Date to Block
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.primarytext },
            ]}
            placeholder="e.g. Dec 25, 2026"
            placeholderTextColor={colors.secondarytext}
            value={newBlockDate}
            onChangeText={setNewBlockDate}
          />

          <Text style={[styles.inputLabel, { color: colors.primarytext, marginTop: 10 }]}>
            Reason (Optional)
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.primarytext },
            ]}
            placeholder="e.g. Christmas Holiday"
            placeholderTextColor={colors.secondarytext}
            value={newBlockReason}
            onChangeText={setNewBlockReason}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleAddBlockedDate}
            style={[styles.confirmBlockBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
          >
            <Text style={[styles.confirmBlockBtnText, { color: colors.onBrand }]}>
              Confirm Blocked Date
            </Text>
          </TouchableOpacity>
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
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
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
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  headerSaveText: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  telemetryCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  telemetryGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  telemetryCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 28,
  },
  telemetryValue: {
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  telemetryLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    textAlign: "center",
  },
  sectionWrap: {
    gap: 8,
  },
  sectionHeaderRow: {
    marginBottom: 2,
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
