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
}: InputFieldProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPasswordType = secureTextEntry;

  return (
    <View style={styles.container}>
      {/* Label Row */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.primarytext }]}>
          {label}
        </Text>
        {rightLabelAction}
      </View>

      {/* Input Box */}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? colors.error
              : isFocused
                ? colors.primary
                : colors.surfacevariant,
          },
        ]}
      >
        {iconName ? (
          <View style={styles.iconContainer}>
            <Ionicons
              name={iconName}
              size={20}
              color={isFocused ? colors.primary : colors.secondarytext}
            />
          </View>
        ) : null}

        <TextInput
          style={[styles.input, { color: colors.primarytext }]}
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPasswordType && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
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
              size={20}
              color={colors.secondarytext}
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
    marginBottom: 16,
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.2,
    height: 45,
    paddingHorizontal: 14,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
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
    marginTop: 4,
    marginLeft: 2,
    fontWeight: "500",
  },
});
