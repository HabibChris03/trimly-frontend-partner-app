import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export const DEFAULT_BARBER_SPECIALTIES = [
  // Barber specialties
  "Skin Fades",
  "Taper Fade & Lineup",
  "Beard Sculpting & Shape",
  "Classic Scissor Cut",
  "Buzz Cut & Edge-Up",
  "Luxury Hot Towel Shave",
  "Straight Razor Shave",
  "Hair Design & Razor Etching",
  "Waves & 360 Enhancements",
  // Shared
  "Dreadlocks & Retwist",
  "Braids & Cornrows",
  "Hair Coloring & Tint",
  "Kids Haircut & Gentle Styling",
  "Scalp Treatment & Deep Wash",
  // Hairdresser specialties
  "Box Braids",
  "Knotless Braids",
  "Locs & Loc Maintenance",
  "Weave Installation",
  "Wig Making & Application",
  "Natural Hair Styling",
  "Silk Press & Blowout",
  "Twist & Twistout",
  "Crochet Styles",
  "Hair Treatments & Conditioning",
  "Balayage & Highlights",
  "Perms & Relaxers",
];

interface SpecialtiesDropdownProps {
  value: string;
  onChangeValue: (value: string) => void;
  onDropdownToggle?: (isOpen: boolean) => void;
}

export default function SpecialtiesDropdown({
  value,
  onChangeValue,
  onDropdownToggle,
}: SpecialtiesDropdownProps) {
  const { t } = useLanguage();
  const colors = useColors();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [customList, setCustomList] = useState<string[]>([]);

  // Parse comma-separated value into array of selected items
  const selectedItems = value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // Combine default options with any user-added custom options
  const allOptions = Array.from(
    new Set([...DEFAULT_BARBER_SPECIALTIES, ...customList, ...selectedItems])
  );

  // Filter options by search query
  const filteredOptions = allOptions.filter((opt) =>
    opt.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const toggleDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (onDropdownToggle) {
      onDropdownToggle(nextState);
    }
  };

  const handleToggleItem = (item: string) => {
    let updated: string[];
    if (selectedItems.some((s) => s.toLowerCase() === item.toLowerCase())) {
      updated = selectedItems.filter(
        (s) => s.toLowerCase() !== item.toLowerCase()
      );
    } else {
      updated = [...selectedItems, item];
    }
    onChangeValue(updated.join(", "));
  };

  const handleRemoveItem = (item: string) => {
    const updated = selectedItems.filter(
      (s) => s.toLowerCase() !== item.toLowerCase()
    );
    onChangeValue(updated.join(", "));
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    if (!allOptions.some((opt) => opt.toLowerCase() === trimmed.toLowerCase())) {
      setCustomList((prev) => [...prev, trimmed]);
    }

    if (
      !selectedItems.some((s) => s.toLowerCase() === trimmed.toLowerCase())
    ) {
      const updated = [...selectedItems, trimmed];
      onChangeValue(updated.join(", "));
    }

    setCustomInput("");
  };

  const hasCustomText = Boolean(customInput.trim());

  return (
    <View style={styles.wrapper}>
      {/* Selected Items Tags / Chips */}
      {selectedItems.length > 0 && (
        <View style={styles.chipsContainer}>
          {selectedItems.map((item) => (
            <View
              key={item}
              style={[
                styles.chip,
                {
                  backgroundColor: colors.brandSoft,
                  borderColor: colors.brandBorder,
                },
              ]}
            >
              <Ionicons name="cut-outline" size={13} color={colors.brand} />
              <Text
                style={[styles.chipText, { color: colors.primaryText }]}
                numberOfLines={1}
              >
                {item}
              </Text>
              <TouchableOpacity
                onPress={() => handleRemoveItem(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.chipRemoveBtn}
              >
                <Ionicons
                  name="close-circle"
                  size={15}
                  color={colors.secondaryText}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Dropdown Menu Trigger */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggleDropdown}
        style={[
          styles.triggerBtn,
          {
            backgroundColor: colors.card,
            borderColor: isOpen ? colors.brand : colors.border,
          },
        ]}
      >
        <View style={styles.triggerLeft}>
          <Ionicons
            name={isOpen ? "list" : "sparkles-outline"}
            size={17}
            color={colors.brand}
          />
          <Text
            style={[styles.triggerText, { color: colors.primaryText }]}
            numberOfLines={1}
          >
            {isOpen
              ? "Hide specialties menu"
              : selectedItems.length > 0
                ? `Select more specialties (${selectedItems.length} selected)`
                : "Select from specialties dropdown"}
          </Text>
        </View>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.secondaryText}
        />
      </TouchableOpacity>

      {/* Dropdown Content */}
      {isOpen && (
        <View
          style={[
            styles.dropdownBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Search Box */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={16}
              color={colors.secondaryText}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.primaryText }]}
              placeholder={t("common.searchSpecialties") || "Search specialties..."}
              placeholderTextColor={colors.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={colors.secondaryText}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Guidance */}
          <Text
            style={[styles.dropdownSubtext, { color: colors.secondaryText }]}
          >
            Tap a specialty to add or remove:
          </Text>

          {/* Options Grid */}
          <View style={styles.optionsGrid}>
            {filteredOptions.map((opt) => {
              const isSelected = selectedItems.some(
                (s) => s.toLowerCase() === opt.toLowerCase()
              );
              return (
                <TouchableOpacity
                  key={opt}
                  activeOpacity={0.78}
                  onPress={() => handleToggleItem(opt)}
                  style={[
                    styles.optionPill,
                    {
                      backgroundColor: isSelected
                        ? colors.brand
                        : colors.background,
                      borderColor: isSelected ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={isSelected ? "checkmark" : "add-outline"}
                    size={14}
                    color={isSelected ? colors.onBrand : colors.secondaryText}
                  />
                  <Text
                    style={[
                      styles.optionPillText,
                      {
                        color: isSelected
                          ? colors.onBrand
                          : colors.primaryText,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredOptions.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              No matching preset found. Add it below.
            </Text>
          )}

          {/* Add Custom Specialty Section */}
          <View
            style={[
              styles.customSection,
              { borderTopColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.customSectionTitle,
                { color: colors.secondaryText },
              ]}
            >
              Add your own specialty
            </Text>
            <View style={styles.customInputRow}>
              <TextInput
                style={[
                  styles.customTextInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.primaryText,
                  },
                ]}
                placeholder="e.g. Afro Burst Fade, Beard Spa..."
                placeholderTextColor={colors.inputPlaceholder}
                value={customInput}
                onChangeText={setCustomInput}
                onSubmitEditing={handleAddCustom}
                returnKeyType="done"
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAddCustom}
                disabled={!hasCustomText}
                style={[
                  styles.addCustomBtn,
                  {
                    backgroundColor: hasCustomText
                      ? colors.brand
                      : colors.secondarySurface,
                    borderColor: hasCustomText ? colors.brand : colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color={hasCustomText ? colors.onBrand : colors.mutedText}
                />
                <Text
                  style={[
                    styles.addCustomBtnText,
                    {
                      color: hasCustomText ? colors.onBrand : colors.mutedText,
                    },
                  ]}
                >
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Close Dropdown Bar */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              setIsOpen(false);
              if (onDropdownToggle) onDropdownToggle(false);
            }}
            style={[
              styles.doneButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.brandBorder,
              },
            ]}
          >
            <Ionicons name="checkmark" size={15} color={colors.brand} />
            <Text style={[styles.doneButtonText, { color: colors.brand }]}>
              Done Selecting
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginTop: -6,
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  chipRemoveBtn: {
    padding: 1,
  },
  triggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  triggerText: {
    fontSize: 13.5,
    fontWeight: "500",
  },
  dropdownBox: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    height: "100%",
    paddingVertical: 0,
  },
  dropdownSubtext: {
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 2,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 12,
  },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1,
    gap: 5,
  },
  optionPillText: {
    fontSize: 12.5,
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: "center",
    paddingVertical: 8,
  },
  customSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  customSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 2,
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customTextInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13.5,
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 4,
  },
  addCustomBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    gap: 6,
  },
  doneButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
