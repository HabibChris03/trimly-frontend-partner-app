import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useColors from "@/hooks/usecolor";

export interface SortOption {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: SortOption[];
  selectedOption: string;
  onSelectOption: (optionId: string) => void;
}

export default function SortModal({
  visible,
  onClose,
  title = "Sort Results",
  options,
  selectedOption,
  onSelectOption,
}: SortModalProps) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleWrap}>
                  <Ionicons name="swap-vertical" size={20} color={colors.primary} />
                  <Text style={[styles.title, { color: colors.primarytext }]}>
                    {title}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={20} color={colors.secondarytext} />
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <View style={styles.optionsList}>
                {options.map((option) => {
                  const isSelected = selectedOption === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        onSelectOption(option.id);
                        onClose();
                      }}
                      style={[
                        styles.optionRow,
                        {
                          backgroundColor: isSelected
                            ? "rgba(163, 179, 156, 0.12)"
                            : "transparent",
                          borderColor: isSelected ? colors.primary : "transparent",
                        },
                      ]}
                    >
                      <View style={styles.optionLeft}>
                        {option.icon && (
                          <Ionicons
                            name={option.icon}
                            size={18}
                            color={isSelected ? colors.primary : colors.secondarytext}
                            style={{ marginRight: 12 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected ? colors.primary : colors.primarytext,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          {
                            borderColor: isSelected
                              ? colors.primary
                              : colors.secondarytext,
                          },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.radioInner,
                              { backgroundColor: colors.primary },
                            ]}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
  },
  optionsList: {
    gap: 6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionLabel: {
    fontSize: 14.5,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
