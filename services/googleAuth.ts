import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { GOOGLE_OAUTH_CONFIG } from "@/constants/oauth";

// Ensure auth session completes when redirecting back
try {
  WebBrowser.maybeCompleteAuthSession();
} catch {}

export interface GoogleAuthResult {
  type: "success" | "cancel" | "error";
  idToken?: string;
  accessToken?: string;
  error?: string;
}

/**
 * Parses query parameters and hash fragments from an auth callback URL.
 * Independent of expo-crypto and expo-auth-session.
 */
export function parseAuthUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!url) return params;

  const queryIndex = url.indexOf("?");
  const hashIndex = url.indexOf("#");

  let queryString = "";
  let hashString = "";

  if (queryIndex !== -1) {
    queryString =
      hashIndex > queryIndex
        ? url.substring(queryIndex + 1, hashIndex)
        : url.substring(queryIndex + 1);
  }

  if (hashIndex !== -1) {
    hashString = url.substring(hashIndex + 1);
  }

  const combined = [queryString, hashString].filter(Boolean).join("&");
  if (!combined) return params;

  const pairs = combined.split("&");
  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    if (eqIdx !== -1) {
      const rawKey = pair.substring(0, eqIdx);
      const rawVal = pair.substring(eqIdx + 1);
      try {
        params[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal);
      } catch {
        params[rawKey] = rawVal;
      }
    } else {
      params[pair] = "";
    }
  }

  return params;
}

/**
 * Triggers Google OAuth authentication in an in-app browser or Web window for Partner app.
 */
export async function promptGoogleAuth(): Promise<GoogleAuthResult> {
  try {
    const isWeb = Platform.OS === "web";
    const clientId = GOOGLE_OAUTH_CONFIG.clientId;
    const redirectUri =
      isWeb && typeof window !== "undefined"
        ? window.location.origin
        : GOOGLE_OAUTH_CONFIG.redirectUri;
    const returnUrl =
      isWeb && typeof window !== "undefined"
        ? window.location.origin
        : GOOGLE_OAUTH_CONFIG.customSchemeRedirectUri;

    const nonce =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    const queryParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "id_token token",
      scope: GOOGLE_OAUTH_CONFIG.scopes.join(" "),
      nonce: nonce,
      prompt: "select_account",
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${queryParams.toString()}`;

    const startUrl = isWeb
      ? googleAuthUrl
      : `https://auth.expo.io/@habib_chris/trimly-partner/start?authUrl=${encodeURIComponent(
          googleAuthUrl
        )}&returnUrl=${encodeURIComponent(returnUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(
      startUrl,
      isWeb ? redirectUri : returnUrl
    );

    if (result.type === "success" && result.url) {
      const parsed = parseAuthUrl(result.url);
      const idToken = parsed.id_token;
      const accessToken = parsed.access_token;

      if (idToken || accessToken) {
        return {
          type: "success",
          idToken: idToken || accessToken,
          accessToken: accessToken,
        };
      }

      if (parsed.error) {
        return {
          type: "error",
          error: parsed.error_description || parsed.error,
        };
      }
    }

    if (result.type === "cancel" || result.type === "dismiss") {
      return { type: "cancel" };
    }

    return { type: "error", error: "Google sign-in was cancelled or dismissed." };
  } catch (err: any) {
    return {
      type: "error",
      error: err?.message || "Failed to start Google sign in.",
    };
  }
}
