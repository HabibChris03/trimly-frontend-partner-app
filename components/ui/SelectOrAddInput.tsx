import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useColors from "@/hooks/usecolor";

interface SelectOrAddInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChangeValue: (value: string) => void;
  options: string[];
  iconName?: keyof typeof Ionicons.glyphMap;
  allowCustom?: boolean;
  customPlaceholder?: string;
  helperText?: string;
}

export function SelectOrAddInput({
  label,
  placeholder = "Select an option...",
  value,
  onChangeValue,
  options,
  iconName = "chevron-down-outline",
  allowCustom = true,
  customPlaceholder = "Type custom value...",
  helperText,
}: SelectOrAddInputProps) {
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customText, setCustomText] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectOption = (opt: string) => {
    onChangeValue(opt);
    setModalVisible(false);
    setSearchQuery("");
    setIsAddingCustom(false);
  };

  const handleAddCustom = () => {
    if (customText.trim()) {
      onChangeValue(customText.trim());
      setCustomText("");
      setIsAddingCustom(false);
      setModalVisible(false);
      setSearchQuery("");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.secondarytext }]}>
        {label}
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={[
          styles.inputButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfacevariant,
          },
        ]}
      >
        <Text
          style={[
            styles.valueText,
            { color: value ? colors.primarytext : colors.inputPlaceholder },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name={iconName} size={18} color={colors.secondarytext} />
      </TouchableOpacity>

      {helperText && (
        <Text style={[styles.helperText, { color: colors.secondarytext }]}>
          {helperText}
        </Text>
      )}

      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primarytext }]}>
                {label}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setIsAddingCustom(false);
                }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.secondarytext} />
              </TouchableOpacity>
            </View>

            {/* Search filter input */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.background, borderColor: colors.surfacevariant },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={colors.secondarytext} />
              <TextInput
                style={[styles.searchInput, { color: colors.primarytext }]}
                placeholder="Search options..."
                placeholderTextColor={colors.inputPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color={colors.secondarytext} />
                </TouchableOpacity>
              )}
            </View>

            {/* Custom Entry View */}
            {isAddingCustom ? (
              <View style={styles.customAddWrap}>
                <Text style={[styles.customAddTitle, { color: colors.primarytext }]}>
                  Add Custom Option
                </Text>
                <TextInput
                  style={[
                    styles.customInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.primary,
                      color: colors.primarytext,
                    },
                  ]}
                  placeholder={customPlaceholder}
                  placeholderTextColor={colors.inputPlaceholder}
                  value={customText}
                  onChangeText={setCustomText}
                  autoFocus
                />
                <View style={styles.customBtnRow}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.surfacevariant }]}
                    onPress={() => setIsAddingCustom(false)}
                  >
                    <Text style={{ color: colors.secondarytext, fontSize: 13 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddCustom}
                  >
                    <Text style={{ color: "#1C1E1B", fontWeight: "700", fontSize: 13 }}>
                      Use Custom
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Options List */
              <ScrollView
                style={styles.optionsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {filteredOptions.map((option, idx) => {
                  const isSelected = value === option;
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => handleSelectOption(option)}
                      style={[
                        styles.optionItem,
                        {
                          borderBottomColor: colors.surfacevariant,
                          backgroundColor: isSelected
                            ? "rgba(163, 179, 156, 0.15)"
                            : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: isSelected ? colors.primary : colors.primarytext,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {option}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {filteredOptions.length === 0 && (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: colors.secondarytext }]}>
                      No matching option found.
                    </Text>
                  </View>
                )}

                {/* Add Custom Button */}
                {allowCustom && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setCustomText(searchQuery);
                      setIsAddingCustom(true);
                    }}
                    style={[
                      styles.addCustomBtn,
                      {
                        backgroundColor: "rgba(163, 179, 156, 0.12)",
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    <Text style={[styles.addCustomBtnText, { color: colors.primary }]}>
                      {searchQuery
                        ? `Add "${searchQuery}" as custom`
                        : "+ Add custom option"}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  inputButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  valueText: {
    fontSize: 14.5,
    flex: 1,
    marginRight: 8,
  },
  helperText: {
    fontSize: 11.5,
    marginTop: 4,
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "75%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    height: "100%",
  },
  optionsList: {
    maxHeight: 280,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomWidth: 0.5,
  },
  optionText: {
    fontSize: 14,
  },
  emptyWrap: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 12,
    marginBottom: 6,
    gap: 8,
  },
  addCustomBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  customAddWrap: {
    paddingVertical: 8,
  },
  customAddTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    marginBottom: 8,
  },
  customInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 12,
  },
  customBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
