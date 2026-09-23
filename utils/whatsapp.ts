import { Linking } from "react-native";

export const SUPPORT_WHATSAPP_NUMBER = "653811357";
export const SUPPORT_PHONE_INTERNATIONAL = "237653811357";
export const SUPPORT_PHONE_DISPLAY = "+237 653 81 13 57";

/**
 * Redirects the user directly to WhatsApp for support inquiries.
 * Uses native WhatsApp deep link when available, falling back to universal wa.me web link.
 *
 * @param phone Phone number without country code or with country code (defaults to 653811357)
 * @param message Default pre-filled message
 */
export async function openWhatsApp(
  phone: string = SUPPORT_WHATSAPP_NUMBER,
  message: string = "Hello Trimly Support, I need assistance with the app."
): Promise<boolean> {
  const digits = phone.replace(/[^0-9]/g, "");
  // Ensure Cameroon country code 237 is present
  const fullPhone = digits.startsWith("237") ? digits : `237${digits}`;
  const encodedText = encodeURIComponent(message);

  const nativeUrl = `whatsapp://send?phone=${fullPhone}&text=${encodedText}`;
  const webUrl = `https://wa.me/${fullPhone}?text=${encodedText}`;

  try {
    const canOpen = await Linking.canOpenURL(nativeUrl);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
      return true;
    } else {
      await Linking.openURL(webUrl);
      return true;
    }
  } catch {
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch {
      return false;
    }
  }
}
