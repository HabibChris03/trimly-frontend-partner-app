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
  "Skin Fades",
  "Taper Fade & Lineup",
  "Beard Sculpting & Shape",
  "Classic Scissor Cut",
  "Buzz Cut & Edge-Up",
  "Luxury Hot Towel Shave",
  "Dreadlocks & Retwist",
  "Braids & Cornrows",
  "Hair Coloring & Tint",
  "Kids Haircut & Gentle Styling",
  "Waves & 360 Enhancements",
  "Scalp Treatment & Deep Wash",
  "Straight Razor Shave",
  "Hair Design & Razor Etching",
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
  const allOptions = Array.from(new Set([...DEFAULT_BARBER_SPECIALTIES, ...customList, ...selectedItems]));

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

    // Check if not already in custom list
    if (!allOptions.some((opt) => opt.toLowerCase() === trimmed.toLowerCase())) {
      setCustomList((prev) => [...prev, trimmed]);
    }

    // Select the newly added custom item
    if (!selectedItems.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...selectedItems, trimmed];
      onChangeValue(updated.join(", "));
    }

    setCustomInput("");
  };

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
                  backgroundColor: "rgba(95, 122, 97, 0.14)",
                  borderColor: colors.primary,
                },
              ]}
            >
              <Ionicons name="cut-outline" size={13} color={colors.primary} />
              <Text
                style={[styles.chipText, { color: colors.primarytext }]}
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
                  color={colors.secondarytext}
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
            backgroundColor: colors.surface,
            borderColor: isOpen ? colors.primary : colors.surfacevariant,
          },
        ]}
      >
        <View style={styles.triggerLeft}>
          <Ionicons
            name={isOpen ? "list" : "sparkles-outline"}
            size={16}
            color={colors.primary}
          />
          <Text
            style={[styles.triggerText, { color: colors.primarytext }]}
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
          color={colors.secondarytext}
        />
      </TouchableOpacity>

      {/* Dropdown Content */}
      {isOpen && (
        <View
          style={[
            styles.dropdownBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          {/* Search Box */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={15}
              color={colors.secondarytext}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.primarytext }]}
              placeholder="Search specialties..."
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
                  color={colors.secondarytext}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Guidance */}
          <Text
            style={[styles.dropdownSubtext, { color: colors.secondarytext }]}
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
                  activeOpacity={0.75}
                  onPress={() => handleToggleItem(opt)}
                  style={[
                    styles.optionPill,
                    {
                      backgroundColor: isSelected
                        ? "rgba(95, 122, 97, 0.16)"
                        : colors.background,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.surfacevariant,
                    },
                  ]}
                >
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "add-outline"}
                    size={15}
                    color={isSelected ? colors.primary : colors.secondarytext}
                  />
                  <Text
                    style={[
                      styles.optionPillText,
                      {
                        color: isSelected
                          ? colors.primary
                          : colors.primarytext,
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
            <Text style={[styles.emptyText, { color: colors.secondarytext }]}>
              No matching preset found. Add it below!
            </Text>
          )}

          {/* Add Custom Specialty Section */}
          <View
            style={[
              styles.customSection,
              { borderTopColor: colors.surfacevariant },
            ]}
          >
            <Text
              style={[styles.customSectionTitle, { color: colors.secondarytext }]}
            >
              Add your own specialty
            </Text>
            <View style={styles.customInputRow}>
              <TextInput
                style={[
                  styles.customTextInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.surfacevariant,
                    color: colors.primarytext,
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
                disabled={!customInput.trim()}
                style={[
                  styles.addCustomBtn,
                  {
                    backgroundColor: customInput.trim()
                      ? colors.primary
                      : colors.surfacevariant,
                  },
                ]}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color={customInput.trim() ? "#FFFFFF" : colors.secondarytext}
                />
                <Text
                  style={[
                    styles.addCustomBtnText,
                    {
                      color: customInput.trim()
                        ? "#FFFFFF"
                        : colors.secondarytext,
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
            activeOpacity={0.7}
            onPress={() => setIsOpen(false)}
            style={[
              styles.doneButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <Ionicons name="checkmark" size={15} color={colors.primary} />
            <Text style={[styles.doneButtonText, { color: colors.primary }]}>
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
    marginTop: -8,
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
    paddingVertical: 5,
    borderRadius: 16,
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
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
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
    gap: 6,
    marginBottom: 12,
  },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
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
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 8,
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
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 4,
  },
  addCustomBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    gap: 6,
  },
  doneButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
