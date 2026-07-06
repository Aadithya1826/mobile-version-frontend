import { DarkTheme, DefaultTheme, ThemeProvider, Slot } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LanguageProvider } from '@/context/LanguageContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LanguageProvider>
        <AnimatedSplashOverlay />
        <Slot />
      </LanguageProvider>
    </ThemeProvider>
  );
}
