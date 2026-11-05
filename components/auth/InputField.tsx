import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type IconName = keyof typeof Ionicons.glyphMap;

interface InputFieldProps {
  label: string;
  iconName?: IconName;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  error?: string;
  rightLabelAction?: React.ReactNode;
  maxLength?: number;
}

export default function InputField({
  label,
  iconName,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  autoCorrect = false,
  error,
  rightLabelAction,
  maxLength,
}: InputFieldProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPasswordType = secureTextEntry;
  const isPhoneInput =
    keyboardType === "phone-pad" ||
    iconName === "call-outline" ||
    /phone|téléphone/i.test(label);
  const effectiveMaxLength = maxLength !== undefined ? maxLength : (isPhoneInput ? 10 : undefined);

  const handleTextChange = (text: string) => {
    if (isPhoneInput) {
      const sanitized = text.replace(/[^0-9]/g, "").slice(0, 10);
      onChangeText(sanitized);
    } else {
      onChangeText(text);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.primaryText }]}>
          {label}
        </Text>
        {rightLabelAction}
      </View>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.card,
            borderColor: error
              ? colors.error
              : isFocused
                ? colors.brand
                : colors.border,
          },
        ]}
      >
        {iconName ? (
          <View style={styles.iconContainer}>
            <Ionicons
              name={iconName}
              size={19}
              color={isFocused ? colors.brand : colors.secondaryText}
            />
          </View>
        ) : null}

        <TextInput
          style={[styles.input, { color: colors.primaryText }]}
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          value={value}
          onChangeText={handleTextChange}
          secureTextEntry={isPasswordType && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={effectiveMaxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {isPasswordType ? (
          <TouchableOpacity
            style={styles.rightIconButton}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={19}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1,
    height: 50,
    paddingHorizontal: 14,
  },
  iconContainer: {
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
    paddingVertical: 0,
  },
  rightIconButton: {
    padding: 4,
    marginLeft: 6,
  },
  errorText: {
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
    fontWeight: "500",
  },
});
