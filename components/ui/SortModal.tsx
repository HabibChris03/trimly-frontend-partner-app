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
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={styles.headerTitleWrap}>
                  <Ionicons name="swap-vertical" size={20} color={colors.accent} />
                  <Text style={[styles.title, { color: colors.primaryText }]}>
                    {title}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={[
                    styles.closeBtn,
                    {
                      backgroundColor: colors.secondarySurface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons name="close" size={18} color={colors.secondaryText} />
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
                            ? colors.brandSoft
                            : "transparent",
                          borderColor: isSelected ? colors.brandBorder : "transparent",
                        },
                      ]}
                    >
                      <View style={styles.optionLeft}>
                        {option.icon && (
                          <Ionicons
                            name={option.icon}
                            size={18}
                            color={isSelected ? colors.accent : colors.secondaryText}
                            style={{ marginRight: 12 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected ? colors.accent : colors.primaryText,
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
                              ? colors.accent
                              : colors.secondaryText,
                          },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.radioInner,
                              { backgroundColor: colors.accent },
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
