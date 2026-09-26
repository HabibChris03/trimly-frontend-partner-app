import * as Haptics from "expo-haptics";
import { Platform } from "react-native";


class FeedbackService {
  private soundObject: any = null;
  private isAudioConfigured = false;

  private async configureAudio() {
    if (this.isAudioConfigured || !AudioModule) return;
    try {
      await AudioModule.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      this.isAudioConfigured = true;
    } catch {
      // Audio config failed gracefully
    }
  }

  /**
   * Triggers haptic feedback
   */
  async triggerSuccessHaptic() {
    try {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }
    } catch {
      // Haptics not available on this device
    }
  }

  async triggerImpact(
    style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium
  ) {
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(style);
      }
    } catch {
      // Haptics not available
    }
  }

  async triggerErrorHaptic() {
    try {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
      }
    } catch {
      // Haptics not available
    }
  }

  /**
   * Plays the booking confirmed melodic chime
   */
  async playBookingConfirmedSound() {
    if (!AudioModule) return;
    try {
      await this.configureAudio();

      if (this.soundObject) {
        try {
          await this.soundObject.unloadAsync();
        } catch {
          // ignore unload error
        }
      }

      const soundAsset = require("@/assets/sounds/booking-confirmed.wav");
      const { sound } = await AudioModule.Sound.createAsync(
        soundAsset,
        { shouldPlay: true, volume: 1.0 }
      );
      this.soundObject = sound;

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => null);
        }
      });
    } catch {
      // Audio playback failed gracefully
    }
  }

  /**
   * Triggers full multi-sensory booking confirmation:
   * 1. Success Haptic Notification
   * 2. Harmonious Confirmation Audio Chime
   */
  async playBookingConfirmedFeedback() {
    // 1. Trigger immediate haptic
    this.triggerSuccessHaptic();

    // 2. Play sound in parallel
    await this.playBookingConfirmedSound();

    // 3. Follow up with subtle celebratory haptic tap
    setTimeout(() => {
      this.triggerImpact(Haptics.ImpactFeedbackStyle.Light);
    }, 160);
  }
}

export const feedback = new FeedbackService();
