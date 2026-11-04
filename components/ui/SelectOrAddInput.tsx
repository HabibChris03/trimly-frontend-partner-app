import { useLanguage } from "@/context/LanguageContext";
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
  const { t, language } = useLanguage();
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
      <Text style={[styles.label, { color: colors.secondaryText }]}>
        {label}
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={[
          styles.inputButton,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.valueText,
            { color: value ? colors.primaryText : colors.inputPlaceholder },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name={iconName} size={18} color={colors.secondaryText} />
      </TouchableOpacity>

      {helperText && (
        <Text style={[styles.helperText, { color: colors.secondaryText }]}>
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                {label}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setIsAddingCustom(false);
                }}
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

            {/* Search filter input */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={colors.secondaryText} />
              <TextInput
                style={[styles.searchInput, { color: colors.primaryText }]}
                placeholder={t("common.searchOptions") || "Search options..."}
                placeholderTextColor={colors.inputPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                </TouchableOpacity>
              )}
            </View>

            {/* Custom Entry View */}
            {isAddingCustom ? (
              <View style={styles.customAddWrap}>
                <Text style={[styles.customAddTitle, { color: colors.primaryText }]}>
                  Add Custom Option
                </Text>
                <TextInput
                  style={[
                    styles.customInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.brand,
                      color: colors.primaryText,
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
                    style={[
                      styles.cancelBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.secondarySurface,
                      },
                    ]}
                    onPress={() => setIsAddingCustom(false)}
                  >
                    <Text style={{ color: colors.primaryText, fontSize: 13, fontWeight: "600" }}>
                      {t("common.cancel") || "Cancel"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: colors.brand }]}
                    onPress={handleAddCustom}
                  >
                    <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 13 }}>
                      {t("common.useCustom") || "Use Custom"}
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
                          borderBottomColor: colors.border,
                          backgroundColor: isSelected
                            ? colors.brandSoft
                            : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: isSelected ? colors.accent : colors.primaryText,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {option}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {filteredOptions.length === 0 && (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: colors.secondaryText }]}>{language === "fr" ? "Aucune option correspondante trouvée." : "No matching option found."}</Text>
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
                        backgroundColor: colors.brandSoft,
                        borderColor: colors.brandBorder,
                      },
                    ]}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                    <Text style={[styles.addCustomBtnText, { color: colors.accent }]}>
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
    fontWeight: "600",
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 1,
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
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
});
