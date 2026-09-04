import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/features/auth/AuthContext';
import {
  VerificationProvider,
} from '../src/features/verification/VerificationContext';
import { OnboardingProvider } from '../src/features/onboarding/OnboardingContext';
import { ProfileProvider } from '../src/features/profile/ProfileContext';
import { CompatibilityProvider } from '../src/features/compatibility/CompatibilityContext';
import { MembershipProvider } from '../src/features/membership/MembershipContext';
import { AppleMembershipProvider } from '../src/features/membership/AppleMembershipProvider';
import { CompletedMemberRouteGuard } from '../src/features/onboarding/CompletedMemberRouteGuard';
import { DiscoveryProvider } from '../src/features/discovery/DiscoveryContext';
import { SafeDateProvider } from '../src/features/safedate/SafeDateContext';
import { FeedbackProvider } from '../src/features/feedback/FeedbackContext';
import { RelationshipProvider } from '../src/features/relationship/RelationshipContext';
import { SuccessProvider } from '../src/features/success/SuccessContext';
import { MemberSafetyProvider } from '../src/features/safety/MemberSafetyContext';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <AuthProvider>
      <MembershipProvider>
      <VerificationProvider>
      <OnboardingProvider>
      <ProfileProvider>
        <CompatibilityProvider>
      <AppleMembershipProvider>
            <DiscoveryProvider>
              <SafeDateProvider>
                <FeedbackProvider>
                  <RelationshipProvider>
                    <SuccessProvider>
                      <MemberSafetyProvider>
                        <CompletedMemberRouteGuard>
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
                        </CompletedMemberRouteGuard>
                      </MemberSafetyProvider>
                    </SuccessProvider>
                  </RelationshipProvider>
                </FeedbackProvider>
              </SafeDateProvider>
            </DiscoveryProvider>
                </AppleMembershipProvider>
        </CompatibilityProvider>
      </ProfileProvider>
      </OnboardingProvider>
          </VerificationProvider>
      </MembershipProvider>
    </AuthProvider>
  );
}
