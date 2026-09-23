export const AppImages = {
  dark: {
    profilePic: require("@/assets/images/profilepic dark.png"),
    backdrop: require("@/assets/images/background trim dark.png"),
    logo: require("@/assets/images/logo.png"),
    icon: require("@/assets/images/icon.png"),
  },
  light: {
    profilePic: require("@/assets/images/profilepic white.png"),
    backdrop: require("@/assets/images/backdrop white.png"),
    logo: require("@/assets/images/logo.png"),
    icon: require("@/assets/images/icon.png"),
  },
};

export const getThemeImages = (isDark: boolean = true) => {
  return isDark ? AppImages.dark : AppImages.light;
};

export const getDefaultProfilePic = (isDark: boolean = true) => {
  return isDark ? AppImages.dark.profilePic : AppImages.light.profilePic;
};

export const getDefaultBackdrop = (isDark: boolean = true) => {
  return isDark ? AppImages.dark.backdrop : AppImages.light.backdrop;
};
