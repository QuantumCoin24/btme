import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { OnboardingProvider } from '../src/features/onboarding/OnboardingContext';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
    </OnboardingProvider>
  );
}
