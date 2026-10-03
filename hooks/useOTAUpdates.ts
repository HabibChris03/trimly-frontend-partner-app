import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import * as Updates from "expo-updates";

/**
 * Hook to automatically check for Over-The-Air (OTA) updates via EAS Update.
 * - In development mode or on web, it exits silently.
 * - When an update is published via EAS, it downloads the update bundle in the background.
 * - Prompts the partner to restart to apply immediately, or lets it apply automatically on next cold launch.
 */
export function useOTAUpdates() {
  useEffect(() => {
    if (__DEV__ || Platform.OS === "web") {
      return;
    }

    async function checkAndApplyUpdates() {
      try {
        if (!Updates.isEnabled) {
          return;
        }

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          // Download the new bundle
          await Updates.fetchUpdateAsync();

          Alert.alert(
            "Update Available",
            "A new update for Trimly Partner has been downloaded. Restart the app to apply the latest improvements?",
            [
              {
                text: "Later",
                style: "cancel",
              },
              {
                text: "Restart Now",
                onPress: async () => {
                  try {
                    await Updates.reloadAsync();
                  } catch {
                    // Fallback: will apply on next restart
                  }
                },
              },
            ]
          );
        }
      } catch (error) {
        // Silently ignore network or offline check failures
        if (__DEV__) {
          console.log("[OTA Updates] Check failed or offline:", error);
        }
      }
    }

    checkAndApplyUpdates();
  }, []);
}
