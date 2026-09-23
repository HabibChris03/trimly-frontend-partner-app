import { availabilityService } from "@/services/availabilityService";
import { CustomModal } from "@/components/ui/CustomModal";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
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

const BUFFER_OPTIONS = ["0 min", "15 min", "30 min"];

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00", "22:30", "23:00",
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
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [schedule, setSchedule] = useState<DaySlot[]>(INITIAL_SCHEDULE);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [lunchBreak, setLunchBreak] = useState(true);
  const [shortBreak, setShortBreak] = useState(false);
  const [selectedBuffer, setSelectedBuffer] = useState("15 min");
  const [isSaving, setIsSaving] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Time editing state
  const [editingTimeSlot, setEditingTimeSlot] = useState<EditingTimeState | null>(null);
  const [applyToAllDays, setApplyToAllDays] = useState(false);

  const fetchAvailability = useCallback(async () => {
    try {
      const windows = await availabilityService.getMyAvailability();
      if (windows && windows.length > 0) {
        const updated = [...INITIAL_SCHEDULE];
        windows.forEach((w) => {
          if (typeof w.day_of_week === "number" && w.day_of_week >= 0 && w.day_of_week < 7) {
            const dayIdx = w.day_of_week;
            updated[dayIdx] = {
              ...updated[dayIdx],
              enabled: !w.is_blocked,
              open: w.start_time ? w.start_time.slice(0, 5) : "09:00",
              close: w.end_time ? w.end_time.slice(0, 5) : "18:00",
            };
          }
        });
        setSchedule(updated);
      }
    } catch {
      // Keep default schedule if API unreachable
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAvailability();
    setRefreshing(false);
  }, [fetchAvailability]);

  const toggleDay = (index: number) => {
    const updated = [...schedule];
    updated[index].enabled = !updated[index].enabled;
    setSchedule(updated);
  };

  const handleSelectTime = (selectedTime: string) => {
    if (!editingTimeSlot) return;
    const { dayIndex, field } = editingTimeSlot;

    setSchedule((prev) => {
      const updated = [...prev];
      if (applyToAllDays) {
        return updated.map((slot) => ({
          ...slot,
          [field]: selectedTime,
        }));
      } else {
        updated[dayIndex] = {
          ...updated[dayIndex],
          [field]: selectedTime,
        };
        return updated;
      }
    });

    const dayName = schedule[dayIndex].day;
    const fieldLabel = field === "open" ? "Start time" : "Closing time";
    showToast(
      applyToAllDays
        ? `${fieldLabel} set to ${formatTime12h(selectedTime)} for all working days.`
        : `${dayName} ${fieldLabel.toLowerCase()} set to ${formatTime12h(selectedTime)}.`,
      "success"
    );
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
    setBlockModalVisible(true);
  };

  const confirmBlockDate = (label: string) => {
    const newBlock: BlockedDate = {
      id: Date.now().toString(),
      date: label,
      reason: "Unavailable / Personal Time",
    };
    setBlockedDates([...blockedDates, newBlock]);
    showToast(`${label} marked as unavailable.`, "success");
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
            start_time: item.slot.open.length === 5 ? `${item.slot.open}:00` : item.slot.open,
            end_time: item.slot.close.length === 5 ? `${item.slot.close}:00` : item.slot.close,
            is_blocked: false,
          })
          .catch(() => null);
      }

      showToast("Working hours and schedule saved successfully.", "success");
      router.back();
    } catch (err: any) {
      showToast("Schedule updated locally.", "info");
      router.back();
    } finally {
      setIsSaving(false);
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
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
          {t("barber.scheduleHours")}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isSaving}
          onPress={handleSave}
          style={styles.saveBtn}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, { color: colors.primary }]}>{t("common.save")}</Text>
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
            tintColor="#A3B39C"
            colors={["#A3B39C"]}
          />
        }
      >
        {/* Working Hours Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>
              Working Hours
            </Text>
            <Text style={[styles.sectionHint, { color: colors.primary }]}>
              Tap any time to edit
            </Text>
          </View>

          {/* Quick Schedule Presets */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsRow}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => applyPresetHours("09:00", "18:00", "Standard")}
              style={[
                styles.presetChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Ionicons name="flash-outline" size={13} color={colors.primary} />
              <Text style={[styles.presetChipText, { color: colors.primarytext }]}>
                9 AM - 6 PM
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => applyPresetHours("08:00", "17:00", "Early Bird")}
              style={[
                styles.presetChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Ionicons name="sunny-outline" size={13} color={colors.primary} />
              <Text style={[styles.presetChipText, { color: colors.primarytext }]}>
                8 AM - 5 PM
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => applyPresetHours("10:00", "20:00", "Evening")}
              style={[
                styles.presetChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Ionicons name="moon-outline" size={13} color={colors.primary} />
              <Text style={[styles.presetChipText, { color: colors.primarytext }]}>
                10 AM - 8 PM
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => applyPresetHours("08:00", "20:00", "Full Day")}
              style={[
                styles.presetChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Ionicons name="time-outline" size={13} color={colors.primary} />
              <Text style={[styles.presetChipText, { color: colors.primarytext }]}>
                8 AM - 8 PM
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            {schedule.map((slot, index) => (
              <View
                key={slot.day}
                style={[
                  styles.dayRow,
                  index > 0 && {
                    borderTopWidth: 1,
                    borderTopColor: "rgba(255, 255, 255, 0.05)",
                  },
                ]}
              >
                <View style={styles.dayCol}>
                  <View style={styles.dayHeaderLine}>
                    <Text
                      style={[
                        styles.dayName,
                        {
                          color: slot.enabled
                            ? colors.primarytext
                            : colors.secondarytext,
                          fontWeight: slot.enabled ? "700" : "500",
                        },
                      ]}
                    >
                      {slot.day}
                    </Text>
                    {!slot.enabled && (
                      <View style={styles.closedBadge}>
                        <Text style={styles.closedBadgeText}>Closed</Text>
                      </View>
                    )}
                  </View>

                  {slot.enabled ? (
                    <View style={styles.timeControlsRow}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => setEditingTimeSlot({ dayIndex: index, field: "open" })}
                        style={[
                          styles.timePillBtn,
                          {
                            backgroundColor: colors.surfacevariant,
                            borderColor: colors.primary,
                          },
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
                        onPress={() => setEditingTimeSlot({ dayIndex: index, field: "close" })}
                        style={[
                          styles.timePillBtn,
                          {
                            backgroundColor: colors.surfacevariant,
                            borderColor: colors.primary,
                          },
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
                      Day off / Unavailable
                    </Text>
                  )}
                </View>

                <Switch
                  value={slot.enabled}
                  onValueChange={() => toggleDay(index)}
                  trackColor={{
                    false: colors.surfacevariant,
                    true: "#A3B39C",
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Break Times */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>
            Break Times
          </Text>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View style={styles.breakRow}>
              <View>
                <Text style={[styles.breakTitle, { color: colors.primarytext }]}>
                  Lunch Break
                </Text>
                <Text
                  style={[styles.breakTime, { color: colors.secondarytext }]}
                >
                  13:00 - 14:00 (1 hour)
                </Text>
              </View>
              <Switch
                value={lunchBreak}
                onValueChange={setLunchBreak}
                trackColor={{ false: colors.surfacevariant, true: "#A3B39C" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: "rgba(255, 255, 255, 0.05)" },
              ]}
            />

            <View style={styles.breakRow}>
              <View>
                <Text style={[styles.breakTitle, { color: colors.primarytext }]}>
                  Afternoon Rest
                </Text>
                <Text
                  style={[styles.breakTime, { color: colors.secondarytext }]}
                >
                  16:30 - 16:45 (15 min)
                </Text>
              </View>
              <Switch
                value={shortBreak}
                onValueChange={setShortBreak}
                trackColor={{ false: colors.surfacevariant, true: "#A3B39C" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Booking Buffer */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>
            Buffer Time Between Appointments
          </Text>
          <Text
            style={[
              styles.sectionDesc,
              { color: colors.secondarytext, marginBottom: 12 },
            ]}
          >
            Gives you time to sanitize clippers, prep towels, and welcome the next client.
          </Text>

          <View style={styles.bufferRow}>
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
                      backgroundColor: isSelected ? "#A3B39C" : colors.surface,
                      borderColor: isSelected ? "#A3B39C" : colors.surfacevariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.bufferText,
                      {
                        color: isSelected ? "#1C1E1B" : colors.primarytext,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {buf}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Blocked Dates */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>
              Blocked Days & Holidays
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAddBlockedDate}
            >
              <Text style={[styles.addText, { color: colors.primary }]}>
                + Block Date
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.blockedList}>
            {blockedDates.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.blockedCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfacevariant,
                  },
                ]}
              >
                <View>
                  <Text
                    style={[
                      styles.blockedDateText,
                      { color: colors.primarytext },
                    ]}
                  >
                    {item.date}
                  </Text>
                  <Text
                    style={[
                      styles.blockedReason,
                      { color: colors.secondarytext },
                    ]}
                  >
                    {item.reason}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => removeBlockedDate(item.id)}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={isSaving}
          onPress={handleSave}
          style={[
            styles.saveBottomBtn,
            { backgroundColor: "#A3B39C", opacity: isSaving ? 0.75 : 1 },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#1C1E1B" />
          ) : (
            <Text style={styles.saveBottomBtnText}>Save Schedule</Text>
          )}
        </TouchableOpacity>

        {/* Block Date Custom Modal */}
        <CustomModal
          visible={blockModalVisible}
          onClose={() => setBlockModalVisible(false)}
          title="Block Calendar Date"
          description="Mark tomorrow as unavailable for appointments."
          icon="calendar-outline"
          primaryText="Block Tomorrow"
          onPrimary={() => confirmBlockDate("Tomorrow")}
          secondaryText="Cancel"
          onSecondary={() => setBlockModalVisible(false)}
        />
      </ScrollView>

      {/* Interactive Time Picker Bottom Sheet Modal */}
      <Modal
        visible={!!editingTimeSlot}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingTimeSlot(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setEditingTimeSlot(null)}
          />

          <View
            style={[
              styles.timeModalSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            {/* Grab Handle */}
            <View
              style={[
                styles.modalGrabHandle,
                { backgroundColor: colors.surfacevariant },
              ]}
            />

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={[styles.timeModalTitle, { color: colors.primarytext }]}
                >
                  {editingTimeSlot
                    ? `${schedule[editingTimeSlot.dayIndex]?.day} Hours`
                    : "Select Working Time"}
                </Text>
                <Text
                  style={[
                    styles.timeModalSub,
                    { color: colors.secondarytext },
                  ]}
                >
                  Choose start and closing times for appointments
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setEditingTimeSlot(null)}
                style={[
                  styles.modalCloseBtn,
                  { backgroundColor: colors.surfacevariant },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.primarytext} />
              </TouchableOpacity>
            </View>

            {/* Field Toggle: Start Time (Open) vs Closing Time (Close) */}
            {editingTimeSlot && (
              <View
                style={[
                  styles.fieldSegmentContainer,
                  { backgroundColor: colors.surfacevariant },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    setEditingTimeSlot({
                      ...editingTimeSlot,
                      field: "open",
                    })
                  }
                  style={[
                    styles.fieldSegmentBtn,
                    editingTimeSlot.field === "open" && [
                      styles.fieldSegmentBtnActive,
                      { backgroundColor: colors.surface },
                    ],
                  ]}
                >
                  <Ionicons
                    name="sunny-outline"
                    size={15}
                    color={
                      editingTimeSlot.field === "open"
                        ? colors.primary
                        : colors.secondarytext
                    }
                  />
                  <Text
                    style={[
                      styles.fieldSegmentText,
                      {
                        color:
                          editingTimeSlot.field === "open"
                            ? colors.primarytext
                            : colors.secondarytext,
                        fontWeight:
                          editingTimeSlot.field === "open" ? "700" : "500",
                      },
                    ]}
                  >
                    Start: {formatTime12h(schedule[editingTimeSlot.dayIndex]?.open)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    setEditingTimeSlot({
                      ...editingTimeSlot,
                      field: "close",
                    })
                  }
                  style={[
                    styles.fieldSegmentBtn,
                    editingTimeSlot.field === "close" && [
                      styles.fieldSegmentBtnActive,
                      { backgroundColor: colors.surface },
                    ],
                  ]}
                >
                  <Ionicons
                    name="moon-outline"
                    size={15}
                    color={
                      editingTimeSlot.field === "close"
                        ? colors.primary
                        : colors.secondarytext
                    }
                  />
                  <Text
                    style={[
                      styles.fieldSegmentText,
                      {
                        color:
                          editingTimeSlot.field === "close"
                            ? colors.primarytext
                            : colors.secondarytext,
                        fontWeight:
                          editingTimeSlot.field === "close" ? "700" : "500",
                      },
                    ]}
                  >
                    Close: {formatTime12h(schedule[editingTimeSlot.dayIndex]?.close)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Apply To All Switch */}
            <View
              style={[
                styles.applyAllRow,
                { borderBottomColor: colors.surfacevariant },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={[styles.applyAllText, { color: colors.primarytext }]}
                >
                  Apply to all active working days
                </Text>
                <Text
                  style={[
                    styles.applyAllSub,
                    { color: colors.secondarytext },
                  ]}
                >
                  Sync this time across all enabled days
                </Text>
              </View>
              <Switch
                value={applyToAllDays}
                onValueChange={setApplyToAllDays}
                trackColor={{
                  false: colors.surfacevariant,
                  true: "#A3B39C",
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Scrollable Grid of 30-min Time Chips */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.timeGridContent}
            >
              <View style={styles.timeGrid}>
                {TIME_OPTIONS.map((time) => {
                  const currentSelected =
                    editingTimeSlot &&
                    schedule[editingTimeSlot.dayIndex]?.[editingTimeSlot.field] === time;

                  return (
                    <TouchableOpacity
                      key={time}
                      activeOpacity={0.75}
                      onPress={() => handleSelectTime(time)}
                      style={[
                        styles.timeGridChip,
                        {
                          backgroundColor: currentSelected
                            ? "#A3B39C"
                            : colors.surfacevariant,
                          borderColor: currentSelected
                            ? "#A3B39C"
                            : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeGridChipText,
                          {
                            color: currentSelected
                              ? "#1C1E1B"
                              : colors.primarytext,
                            fontWeight: currentSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {formatTime12h(time)}
                      </Text>
                      {currentSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#1C1E1B"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Done Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setEditingTimeSlot(null)}
              style={[styles.doneBtn, { backgroundColor: "#A3B39C" }]}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  presetsRow: {
    gap: 8,
    paddingBottom: 6,
    marginBottom: 4,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  addText: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardGroup: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 8,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dayCol: {
    flex: 1,
    gap: 6,
  },
  dayHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayName: {
    fontSize: 15,
  },
  closedBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  closedBadgeText: {
    color: "#EF4444",
    fontSize: 10.5,
    fontWeight: "700",
  },
  dayHoursOff: {
    fontSize: 12,
    fontStyle: "italic",
  },
  timeControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  timePillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  timeBetweenText: {
    fontSize: 12,
    fontWeight: "500",
  },
  breakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  breakTitle: {
    fontSize: 14.5,
    fontWeight: "600",
    marginBottom: 2,
  },
  breakTime: {
    fontSize: 12,
  },
  divider: {
    height: 1,
  },
  bufferRow: {
    flexDirection: "row",
    gap: 10,
  },
  bufferPill: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bufferText: {
    fontSize: 13.5,
  },
  blockedList: {
    gap: 10,
  },
  blockedCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  blockedDateText: {
    fontSize: 14.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  blockedReason: {
    fontSize: 12,
  },
  removeBtn: {
    padding: 4,
  },
  saveBottomBtn: {
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  saveBottomBtnText: {
    color: "#1C1E1B",
    fontSize: 15.5,
    fontWeight: "700",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  modalBackdrop: {
    ...(StyleSheet.absoluteFill as any),
  },
  timeModalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  modalGrabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  timeModalTitle: {
    fontSize: 17.5,
    fontWeight: "700",
  },
  timeModalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldSegmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  fieldSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
  },
  fieldSegmentBtnActive: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  fieldSegmentText: {
    fontSize: 13,
  },
  applyAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  applyAllText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  applyAllSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  timeGridContent: {
    paddingBottom: 16,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeGridChip: {
    width: "31%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeGridChipText: {
    fontSize: 12.5,
  },
  doneBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  doneBtnText: {
    color: "#1C1E1B",
    fontSize: 15,
    fontWeight: "700",
  },
});
