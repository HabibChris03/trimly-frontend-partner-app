import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { barberService } from "@/services/barberService";

export interface ChairSlotStatus {
  status: "idle" | "verifying" | "verified" | "error";
  message?: string;
  barber?: {
    id: number;
    name: string;
    email?: string;
    role?: string;
    staff_title?: string;
    is_owner?: boolean;
  };
}

interface ChairOccupantsEditorProps {
  chairCount: number;
  chairNames: string[];
  onChangeChairNames: (names: string[]) => void;
  chairStatuses: Record<number, ChairSlotStatus>;
  onChangeChairStatuses: React.Dispatch<
    React.SetStateAction<Record<number, ChairSlotStatus>>
  >;
  salonId?: number;
  ownerName?: string | null;
}

export async function verifyAllChairOccupants(
  chairCount: number,
  chairNames: string[],
  salonId?: number,
  ownerName?: string | null
): Promise<{
  valid: boolean;
  verifiedNames: string[];
  statuses: Record<number, ChairSlotStatus>;
  errorMessage?: string;
}> {
  const nextStatuses: Record<number, ChairSlotStatus> = {};
  const verifiedNames: string[] = [];
  const seenIds = new Set<number>();
  const seenNamesLower = new Set<string>();

  for (let i = 0; i < chairCount; i++) {
    const raw = (chairNames[i] || "").trim();
    if (!raw) {
      nextStatuses[i] = {
        status: "error",
        message: `Please enter a barber/hairdresser name for Chair #${i + 1}`,
      };
      return {
        valid: false,
        verifiedNames: [],
        statuses: nextStatuses,
        errorMessage: `Please enter all ${chairCount} barber/hairdresser names to occupy the ${chairCount} chairs.`,
      };
    }

    // Check if owner name matches
    if (
      ownerName &&
      raw.toLowerCase() === ownerName.trim().toLowerCase()
    ) {
      if (seenNamesLower.has(raw.toLowerCase())) {
        nextStatuses[i] = {
          status: "error",
          message: "Already assigned to another chair",
        };
        return {
          valid: false,
          verifiedNames: [],
          statuses: nextStatuses,
          errorMessage: `'${ownerName}' is entered on multiple chairs. Each chair needs its own barber/hairdresser.`,
        };
      }
      seenNamesLower.add(raw.toLowerCase());
      nextStatuses[i] = {
        status: "verified",
        message: "Salon Main Barber (You)",
        barber: {
          id: salonId || 0,
          name: ownerName.trim(),
          role: "barber",
          staff_title: "Main Barber",
          is_owner: true,
        },
      };
      verifiedNames.push(ownerName.trim());
      continue;
    }

    const res = await barberService.verifyChairOccupant(raw, salonId);
    if (!res.found || !res.barber) {
      nextStatuses[i] = {
        status: "error",
        message: "User not found",
      };
      return {
        valid: false,
        verifiedNames: [],
        statuses: nextStatuses,
        errorMessage: "User not found",
      };
    }

    if (
      (res.barber.id && seenIds.has(res.barber.id)) ||
      seenNamesLower.has((res.barber.name || raw).toLowerCase())
    ) {
      nextStatuses[i] = {
        status: "error",
        message: "Already assigned to another chair",
      };
      return {
        valid: false,
        verifiedNames: [],
        statuses: nextStatuses,
        errorMessage: `'${res.barber.name}' is already assigned to another chair.`,
      };
    }

    if (res.barber.id) seenIds.add(res.barber.id);
    seenNamesLower.add((res.barber.name || raw).toLowerCase());

    nextStatuses[i] = {
      status: "verified",
      message: "Verified & Available",
      barber: res.barber,
    };
    verifiedNames.push(res.barber.name || raw);
  }

  return {
    valid: true,
    verifiedNames,
    statuses: nextStatuses,
  };
}

export default function ChairOccupantsEditor({
  chairCount,
  chairNames,
  onChangeChairNames,
  chairStatuses,
  onChangeChairStatuses,
  salonId,
  ownerName,
}: ChairOccupantsEditorProps) {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const [notFoundPopupName, setNotFoundPopupName] = useState<string | null>(
    null
  );

  const handleNameChange = (index: number, text: string) => {
    const updated = [...chairNames];
    while (updated.length < chairCount) {
      updated.push("");
    }
    updated[index] = text;
    onChangeChairNames(updated);

    onChangeChairStatuses((prev) => ({
      ...prev,
      [index]: { status: "idle" },
    }));
  };

  const handleVerifySingleChair = async (index: number, overrideName?: string) => {
    const raw = (overrideName !== undefined ? overrideName : chairNames[index] || "").trim();
    if (!raw) {
      onChangeChairStatuses((prev) => ({
        ...prev,
        [index]: {
          status: "error",
          message: "Enter a barber or hairdresser name",
        },
      }));
      return;
    }

    // Check if salon owner assigned themselves
    if (ownerName && raw.toLowerCase() === ownerName.trim().toLowerCase()) {
      const duplicateIdx = chairNames.findIndex(
        (n, idx) =>
          idx !== index &&
          (n || "").trim().toLowerCase() === ownerName.trim().toLowerCase()
      );
      if (duplicateIdx !== -1) {
        onChangeChairStatuses((prev) => ({
          ...prev,
          [index]: {
            status: "error",
            message: `Already assigned to Chair #${duplicateIdx + 1}`,
          },
        }));
        showToast(`Already assigned to Chair #${duplicateIdx + 1}`, "error");
        return;
      }

      onChangeChairStatuses((prev) => ({
        ...prev,
        [index]: {
          status: "verified",
          message: "Main Barber (You)",
          barber: {
            id: salonId || 0,
            name: ownerName.trim(),
            role: "barber",
            staff_title: "Main Barber",
            is_owner: true,
          },
        },
      }));
      return;
    }

    onChangeChairStatuses((prev) => ({
      ...prev,
      [index]: { status: "verifying" },
    }));

    const res = await barberService.verifyChairOccupant(raw, salonId);
    if (!res.found || !res.barber) {
      onChangeChairStatuses((prev) => ({
        ...prev,
        [index]: {
          status: "error",
          message: "User not found",
        },
      }));
      showToast("User not found", "error");
      setNotFoundPopupName(raw);
      return;
    }

    // Check duplicate across other chairs
    const canonicalName = (res.barber.name || raw).trim();
    const duplicateIdx = chairNames.findIndex(
      (n, idx) =>
        idx !== index &&
        (n || "").trim().toLowerCase() === canonicalName.toLowerCase()
    );
    if (duplicateIdx !== -1) {
      onChangeChairStatuses((prev) => ({
        ...prev,
        [index]: {
          status: "error",
          message: `Already assigned to Chair #${duplicateIdx + 1}`,
        },
      }));
      showToast(
        `${canonicalName} is already assigned to Chair #${duplicateIdx + 1}`,
        "error"
      );
      return;
    }

    // Update name to canonical name and mark verified
    const updatedNames = [...chairNames];
    while (updatedNames.length < chairCount) {
      updatedNames.push("");
    }
    updatedNames[index] = canonicalName;
    onChangeChairNames(updatedNames);

    onChangeChairStatuses((prev) => ({
      ...prev,
      [index]: {
        status: "verified",
        message: "Verified & Linked",
        barber: res.barber,
      },
    }));
  };

  const verifiedCount = Array.from({ length: chairCount }).filter(
    (_, i) => chairStatuses[i]?.status === "verified"
  ).length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(201,168,76,0.06)"
            : "rgba(201,168,76,0.05)",
          borderColor: "rgba(201,168,76,0.3)",
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.headerIconWrap,
              { backgroundColor: "rgba(201,168,76,0.16)" },
            ]}
          >
            <Ionicons name="people" size={16} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.primaryText }]}>
              Assign Barbers / Hairdressers ({chairCount}{" "}
              {chairCount === 1 ? "Chair" : "Chairs"})
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.secondaryText }]}
            >
              Every chair must have a registered barber or hairdresser so it can
              be booked by clients.
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.counterBadge,
            {
              backgroundColor:
                verifiedCount === chairCount
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(201,168,76,0.15)",
            },
          ]}
        >
          <Text
            style={[
              styles.counterBadgeText,
              {
                color:
                  verifiedCount === chairCount ? "#22C55E" : colors.brand,
              },
            ]}
          >
            {verifiedCount}/{chairCount}
          </Text>
        </View>
      </View>

      {/* Chair Slots */}
      <View style={styles.slotsList}>
        {Array.from({ length: chairCount }).map((_, idx) => {
          const val = chairNames[idx] || "";
          const slotState = chairStatuses[idx] || { status: "idle" };
          const isError = slotState.status === "error";
          const isVerified = slotState.status === "verified";
          const isVerifying = slotState.status === "verifying";

          return (
            <View
              key={`chair-slot-${idx}`}
              style={[
                styles.slotCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isError
                    ? "#EF4444"
                    : isVerified
                    ? "#22C55E"
                    : colors.border,
                },
              ]}
            >
              <View style={styles.slotTopRow}>
                <View style={styles.chairBadge}>
                  <Ionicons
                    name="cut-outline"
                    size={13}
                    color={colors.brand}
                  />
                  <Text
                    style={[styles.chairBadgeText, { color: colors.primaryText }]}
                  >
                    Chair #{idx + 1}
                  </Text>
                </View>

                {idx === 0 && ownerName && val.trim().toLowerCase() !== ownerName.trim().toLowerCase() ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      handleNameChange(0, ownerName.trim());
                      handleVerifySingleChair(0, ownerName.trim());
                    }}
                    style={[
                      styles.selfFillChip,
                      {
                        backgroundColor: isDark
                          ? "rgba(201,168,76,0.15)"
                          : "rgba(201,168,76,0.12)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-add-outline"
                      size={11}
                      color={colors.brand}
                    />
                    <Text
                      style={[styles.selfFillChipText, { color: colors.brand }]}
                    >
                      Occupy Myself ({ownerName.trim()})
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.primaryText,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)",
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder={`Enter barber/hairdresser name for Chair #${idx + 1}...`}
                  placeholderTextColor={colors.secondaryText}
                  value={val}
                  onChangeText={(text) => handleNameChange(idx, text)}
                  onBlur={() => {
                    if (val.trim() && slotState.status === "idle") {
                      handleVerifySingleChair(idx);
                    }
                  }}
                  onSubmitEditing={() => handleVerifySingleChair(idx)}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isVerifying || !val.trim()}
                  onPress={() => handleVerifySingleChair(idx)}
                  style={[
                    styles.verifyBtn,
                    {
                      backgroundColor: isVerified
                        ? "#22C55E"
                        : colors.brand,
                      opacity: !val.trim() ? 0.5 : 1,
                    },
                  ]}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color="#0B0C10" />
                  ) : isVerified ? (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={styles.verifyBtnText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Status Feedback */}
              {isVerified && slotState.barber ? (
                <View style={styles.statusRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                  <Text style={[styles.verifiedText, { color: "#22C55E" }]}>
                    Linked: {slotState.barber.name} (
                    {slotState.barber.is_owner
                      ? "Main Barber"
                      : slotState.barber.role === "hairdresser"
                      ? "Hairdresser"
                      : "Barber"}
                    ) — Bookable
                  </Text>
                </View>
              ) : null}

              {isError ? (
                <View style={styles.statusRow}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>
                    {slotState.message || "User not found"}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* "User not found" Pop-up Modal */}
      <Modal
        visible={Boolean(notFoundPopupName)}
        transparent
        animationType="fade"
        onRequestClose={() => setNotFoundPopupName(null)}
      >
        <View style={styles.popupOverlay}>
          <View
            style={[
              styles.popupCard,
              { backgroundColor: colors.card, borderColor: "#EF4444" },
            ]}
          >
            <View style={styles.popupIconCircle}>
              <Ionicons name="person-remove-outline" size={28} color="#EF4444" />
            </View>
            <Text style={[styles.popupTitle, { color: colors.primaryText }]}>
              User not found
            </Text>
            <Text
              style={[styles.popupMessage, { color: colors.secondaryText }]}
            >
              {`"${notFoundPopupName}" could not be linked. Either this barber/hairdresser is not registered on the app, or they are already working under another salon.`}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setNotFoundPopupName(null)}
              style={[styles.popupBtn, { backgroundColor: "#EF4444" }]}
            >
              <Text style={styles.popupBtnText}>OK, Try Another Name</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  counterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  counterBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  slotsList: {
    gap: 10,
  },
  slotCard: {
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    gap: 8,
  },
  slotTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chairBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chairBadgeText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  selfFillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  selfFillChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "600",
  },
  verifyBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 68,
  },
  verifyBtnText: {
    color: "#0B0C10",
    fontSize: 12.5,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "800",
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  popupCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  popupIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(239,68,68,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  popupMessage: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  popupBtn: {
    marginTop: 8,
    width: "100%",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  popupBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
