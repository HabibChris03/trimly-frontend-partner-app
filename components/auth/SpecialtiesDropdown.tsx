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

export interface SpecialtyItemWithPrice {
  name: string;
  price: string;
}

export interface SpecialtiesDropdownProps {
  value: string;
  onChangeValue: (value: string) => void;
  itemsWithPrice?: SpecialtyItemWithPrice[];
  onChangeItemsWithPrice?: (items: SpecialtyItemWithPrice[]) => void;
  onDropdownToggle?: (isOpen: boolean) => void;
}

export default function SpecialtiesDropdown({
  value,
  onChangeValue,
  itemsWithPrice,
  onChangeItemsWithPrice,
  onDropdownToggle,
}: SpecialtiesDropdownProps) {
  const { t, language } = useLanguage();
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

  // Synchronize internal items list with pricing
  const currentItemsList: SpecialtyItemWithPrice[] = itemsWithPrice && itemsWithPrice.length > 0
    ? itemsWithPrice
    : selectedItems.map((name) => ({ name, price: "1000" }));

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
    let updatedNames: string[];
    let updatedItems: SpecialtyItemWithPrice[];

    const exists = currentItemsList.some((s) => s.name.toLowerCase() === item.toLowerCase());
    if (exists) {
      updatedItems = currentItemsList.filter((s) => s.name.toLowerCase() !== item.toLowerCase());
      updatedNames = updatedItems.map((s) => s.name);
    } else {
      updatedItems = [...currentItemsList, { name: item, price: "1000" }];
      updatedNames = updatedItems.map((s) => s.name);
    }

    onChangeValue(updatedNames.join(", "));
    if (onChangeItemsWithPrice) {
      onChangeItemsWithPrice(updatedItems);
    }
  };

  const handleUpdateItemPrice = (idx: number, newPrice: string) => {
    const updated = [...currentItemsList];
    if (updated[idx]) {
      updated[idx].price = newPrice;
      if (onChangeItemsWithPrice) {
        onChangeItemsWithPrice(updated);
      }
    }
  };

  const handleRemoveItem = (itemName: string) => {
    const updatedItems = currentItemsList.filter(
      (s) => s.name.toLowerCase() !== itemName.toLowerCase()
    );
    const updatedNames = updatedItems.map((s) => s.name);
    onChangeValue(updatedNames.join(", "));
    if (onChangeItemsWithPrice) {
      onChangeItemsWithPrice(updatedItems);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    if (!allOptions.some((opt) => opt.toLowerCase() === trimmed.toLowerCase())) {
      setCustomList((prev) => [...prev, trimmed]);
    }

    const exists = currentItemsList.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      const updatedItems = [...currentItemsList, { name: trimmed, price: "1000" }];
      const updatedNames = updatedItems.map((s) => s.name);
      onChangeValue(updatedNames.join(", "));
      if (onChangeItemsWithPrice) {
        onChangeItemsWithPrice(updatedItems);
      }
    }

    setCustomInput("");
  };

  const hasCustomText = Boolean(customInput.trim());

  return (
    <View style={styles.wrapper}>
      {/* Selected Cuts / Specialties with Price Inputs (Default 1,000 CFA) */}
      {currentItemsList.length > 0 && (
        <View style={styles.selectedItemsContainer}>
          <Text style={[styles.selectedHeaderLabel, { color: colors.secondaryText }]}>
            {language === "fr"
              ? "Coupes & Spécialités sélectionnées — Fixer le tarif (Min 1 000 CFA) :"
              : (t("auth.selectedCutsPricing") || "Selected Cuts / Specialties — Set Service Price (Min 1,000 CFA):")}
          </Text>
          {currentItemsList.map((item, idx) => (
            <View
              key={item.name + idx}
              style={[
                styles.itemPriceCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.itemNameWrap}>
                <Ionicons name="cut-outline" size={15} color={colors.brand} />
                <Text
                  style={[styles.itemNameText, { color: colors.primaryText }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              </View>

              <View style={styles.itemPriceWrap}>
                <TextInput
                  style={[
                    styles.itemPriceInput,
                    {
                      color: colors.primaryText,
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  value={item.price}
                  onChangeText={(val) => handleUpdateItemPrice(idx, val)}
                  placeholder="1000"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="numeric"
                />
                <Text style={[styles.cfaText, { color: colors.secondaryText }]}>
                  CFA
                </Text>

                <TouchableOpacity
                  onPress={() => handleRemoveItem(item.name)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.itemRemoveBtn}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color="#EF4444"
                  />
                </TouchableOpacity>
              </View>
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
              ? (language === "fr" ? "Masquer le menu des spécialités" : "Hide specialties menu")
              : selectedItems.length > 0
                ? (language === "fr"
                    ? `Choisir d'autres spécialités (${selectedItems.length} sélectionnée${selectedItems.length > 1 ? "s" : ""})`
                    : `Select more specialties (${selectedItems.length} selected)`)
                : (language === "fr" ? "Choisir dans la liste des spécialités" : "Select from specialties dropdown")}
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
            {language === "fr"
              ? "Touchez une spécialité pour l'ajouter ou la retirer :"
              : "Tap a specialty to add or remove:"}
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
              {language === "fr"
                ? "Aucune spécialité prédéfinie trouvée. Ajoutez la vôtre ci-dessous."
                : "No matching preset found. Add it below."}
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
              {language === "fr" ? "Ajouter votre propre spécialité" : "Add your own specialty"}
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
                placeholder={language === "fr" ? "ex : Dégradé Afro, Soin Barbe..." : "e.g. Afro Burst Fade, Beard Spa..."}
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
            <Text style={[styles.doneButtonText, { color: colors.brand }]}>{language === "fr" ? "Terminer la sélection" : "Done Selecting"}</Text>
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
  selectedItemsContainer: {
    marginBottom: 14,
    gap: 8,
  },
  selectedHeaderLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemPriceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  itemNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
    marginRight: 8,
  },
  itemNameText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  itemPriceWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemPriceInput: {
    width: 76,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  cfaText: {
    fontSize: 11,
    fontWeight: "700",
  },
  itemRemoveBtn: {
    padding: 4,
    marginLeft: 2,
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
