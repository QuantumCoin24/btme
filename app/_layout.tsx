import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { OnboardingProvider } from '../src/features/onboarding/OnboardingContext';
import { ProfileProvider } from '../src/features/profile/ProfileContext';
import { CompatibilityProvider } from '../src/features/compatibility/CompatibilityContext';
import { MembershipProvider } from '../src/features/membership/MembershipContext';

import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <ProfileProvider>
        <CompatibilityProvider>
          <MembershipProvider>
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
          </MembershipProvider>
        </CompatibilityProvider>
      </ProfileProvider>
    </OnboardingProvider>
  );
}
