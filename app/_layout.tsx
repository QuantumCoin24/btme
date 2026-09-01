import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { OnboardingProvider } from '../src/features/onboarding/OnboardingContext';
import { ProfileProvider } from '../src/features/profile/ProfileContext';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <ProfileProvider>
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
      </ProfileProvider>
    </OnboardingProvider>
  );
}
