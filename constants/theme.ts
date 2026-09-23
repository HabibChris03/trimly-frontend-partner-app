import React from 'react';
import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#4B5563',
    background: '#fff',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

let monoglyphicActive = false;

export function setMonoglyphicActive(active: boolean) {
  monoglyphicActive = active;
}

export function isMonoglyphicActive(): boolean {
  return monoglyphicActive;
}

export const FONT_FAMILIES = {
  monoglyphicRegular: 'Monoglyphic-Regular',
  monoglyphicMedium: 'Monoglyphic-Medium',
  monoglyphicSemiBold: 'Monoglyphic-SemiBold',
  monoglyphicBold: 'Monoglyphic-Bold',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
};

export function getFontFamilyForWeight(weight?: string | number): string {
  if (monoglyphicActive) {
    const w = String(weight || '').toLowerCase();
    if (w === '700' || w === 'bold' || w === '800' || w === '900') return FONT_FAMILIES.monoglyphicBold;
    if (w === '600') return FONT_FAMILIES.monoglyphicSemiBold;
    if (w === '500') return FONT_FAMILIES.monoglyphicMedium;
    return FONT_FAMILIES.monoglyphicRegular;
  }

  if (!weight) return FONT_FAMILIES.regular;
  const w = String(weight).toLowerCase();
  if (w === '700' || w === 'bold') return FONT_FAMILIES.bold;
  if (w === '800' || w === '900') return FONT_FAMILIES.extraBold;
  if (w === '600') return FONT_FAMILIES.semiBold;
  if (w === '500') return FONT_FAMILIES.medium;
  return FONT_FAMILIES.regular;
}

export function applyGlobalFont() {
  try {
    const RN = require('react-native');
    const OriginalText = RN.Text;

    if (!OriginalText || (OriginalText as any).__hasGlobalFontApplied) {
      return;
    }

    const CustomText = React.forwardRef((props: any, ref: any) => {
      const { style, children, ...rest } = props;
      const flatStyle = RN.StyleSheet.flatten(style) || {};

      if (flatStyle.fontFamily && flatStyle.fontFamily !== 'System' && flatStyle.fontFamily !== 'normal') {
        return React.createElement(OriginalText, { ...rest, ref, style }, children);
      }

      const family = getFontFamilyForWeight(flatStyle.fontWeight);

      return React.createElement(
        OriginalText,
        {
          ...rest,
          ref,
          style: [{ fontFamily: family }, style],
        },
        children
      );
    });

    (CustomText as any).__hasGlobalFontApplied = true;
    Object.assign(CustomText, OriginalText);
    RN.Text = CustomText;

    const OriginalTextInput = RN.TextInput;
    if (OriginalTextInput && !(OriginalTextInput as any).__hasGlobalFontApplied) {
      const CustomTextInput = React.forwardRef((props: any, ref: any) => {
        const { style, ...rest } = props;
        const flatStyle = RN.StyleSheet.flatten(style) || {};

        if (flatStyle.fontFamily && flatStyle.fontFamily !== 'System' && flatStyle.fontFamily !== 'normal') {
          return React.createElement(OriginalTextInput, { ...rest, ref, style });
        }

        const family = getFontFamilyForWeight(flatStyle.fontWeight);

        return React.createElement(OriginalTextInput, {
          ...rest,
          ref,
          style: [{ fontFamily: family }, style],
        });
      });

      (CustomTextInput as any).__hasGlobalFontApplied = true;
      Object.assign(CustomTextInput, OriginalTextInput);
      RN.TextInput = CustomTextInput;
    }
  } catch {
    // Graceful fallback
  }
}

export const Fonts = {
  sans: FONT_FAMILIES.regular,
  medium: FONT_FAMILIES.medium,
  semiBold: FONT_FAMILIES.semiBold,
  bold: FONT_FAMILIES.bold,
  extraBold: FONT_FAMILIES.extraBold,
  monoglyphic: FONT_FAMILIES.monoglyphicRegular,
  monoglyphicMedium: FONT_FAMILIES.monoglyphicMedium,
  monoglyphicBold: FONT_FAMILIES.monoglyphicBold,
  mono: Platform.select({
    ios: 'ui-monospace',
    default: 'monospace',
  }),
};

