/** Shared dimension tokens (icons, buttons, inputs, layout). */
export const sizes = {
  icon: {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
  },
  button: {
    sm: 36,
    md: 48,
    lg: 54,
  },
  iconButton: 40,
  input: 50,
  avatar: {
    sm: 32,
    md: 44,
    lg: 64,
    xl: 96,
  },
  screenPadding: 20,
  tabBarHeight: 64,
  headerHeight: 56,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;

export type Sizes = typeof sizes;
