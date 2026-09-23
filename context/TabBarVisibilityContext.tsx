import React, {
  createContext,
  useContext,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Animated, NativeScrollEvent, NativeSyntheticEvent } from "react-native";

interface TabBarVisibilityContextType {
  tabBarTranslateY: Animated.Value;
  isTabBarVisible: boolean;
  showTabBar: () => void;
  hideTabBar: () => void;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const TabBarVisibilityContext = createContext<
  TabBarVisibilityContextType | undefined
>(undefined);

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const isVisibleRef = useRef(true);
  const lastScrollY = useRef(0);

  const showTabBar = useCallback(() => {
    if (!isVisibleRef.current) {
      isVisibleRef.current = true;
      setIsTabBarVisible(true);
    }
    Animated.spring(tabBarTranslateY, {
      toValue: 0,
      damping: 20,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [tabBarTranslateY]);

  const hideTabBar = useCallback(() => {
    if (isVisibleRef.current) {
      isVisibleRef.current = false;
      setIsTabBarVisible(false);
    }
    Animated.timing(tabBarTranslateY, {
      toValue: 130, // Slide smoothly below the screen viewport
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [tabBarTranslateY]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const scrollDiff = currentScrollY - lastScrollY.current;

      // Always restore navbar when near or at the top of the scrollview
      if (currentScrollY <= 15) {
        if (!isVisibleRef.current) {
          showTabBar();
        }
        lastScrollY.current = Math.max(0, currentScrollY);
        return;
      }

      // Ignore rubber-band bounce at bottom or top
      const contentHeight = event.nativeEvent.contentSize.height;
      const layoutHeight = event.nativeEvent.layoutMeasurement.height;
      if (currentScrollY + layoutHeight >= contentHeight - 20) {
        lastScrollY.current = currentScrollY;
        return;
      }

      // Scrolling DOWN -> Hide navbar
      if (scrollDiff > 8 && currentScrollY > 30) {
        if (isVisibleRef.current) {
          hideTabBar();
        }
      }
      // Scrolling UP -> Show navbar immediately
      else if (scrollDiff < -6) {
        if (!isVisibleRef.current) {
          showTabBar();
        }
      }

      lastScrollY.current = currentScrollY;
    },
    [hideTabBar, showTabBar]
  );

  return (
    <TabBarVisibilityContext.Provider
      value={{
        tabBarTranslateY,
        isTabBarVisible,
        showTabBar,
        hideTabBar,
        handleScroll,
      }}
    >
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const context = useContext(TabBarVisibilityContext);
  if (!context) {
    const fallbackAnim = new Animated.Value(0);
    return {
      tabBarTranslateY: fallbackAnim,
      isTabBarVisible: true,
      showTabBar: () => {},
      hideTabBar: () => {},
      handleScroll: () => {},
    };
  }
  return context;
}
