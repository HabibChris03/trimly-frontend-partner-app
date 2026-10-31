import { Platform } from "react-native";

/**
 * Google OAuth Configuration for Trimly Partner App
 * Project: trimly237 (655457325785)
 * iOS Bundle: com.trimly.partner
 * Android Package: com.trimly.partner
 */
export const GOOGLE_OAUTH_CONFIG = {
  // iOS Client ID for com.trimly.partner
  iosClientId: "655457325785-piuqg1q6jmrqi6crocohcj8g1kc8tvvn.apps.googleusercontent.com",

  // Android & Web Client ID for trimly237
  androidClientId: "655457325785-qcj8ncsv2qgqfsq5ljp967huephlqh36.apps.googleusercontent.com",
  webClientId: "655457325785-qcj8ncsv2qgqfsq5ljp967huephlqh36.apps.googleusercontent.com",

  // Primary fallback client ID
  clientId: Platform.select({
    ios: "655457325785-piuqg1q6jmrqi6crocohcj8g1kc8tvvn.apps.googleusercontent.com",
    default: "655457325785-qcj8ncsv2qgqfsq5ljp967huephlqh36.apps.googleusercontent.com",
  }) as string,

  responseType: "id_token token",
  scopes: ["openid", "profile", "email"],

  redirectUri: "https://auth.expo.io/@habib_chris/trimly-partner",
  customSchemeRedirectUri: "trimly-partner://",
};
