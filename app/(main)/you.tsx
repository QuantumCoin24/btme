import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useRouter,
} from 'expo-router';
import {
  AppShellScreen,
} from '../../src/components/AppShellScreen';
import {
  loadMyMemberProfile,
  MemberProfileProjection,
} from '../../src/features/member/memberProfile';
import {
  useMembership,
} from '../../src/features/membership/MembershipContext';
import {
  useProfile,
} from '../../src/features/profile/ProfileContext';
import {
  useVerification,
} from '../../src/features/verification/VerificationContext';
import {
  colors,
  radius,
  spacing,
} from '../../src/theme/tokens';

const intentLabels = {
  relationship: 'A relationship',
  'life-partner': 'A life partner',
  'intentional-dating': 'Intentional dating',
  'open-genuine': 'Open to something genuine',
} as const;

const preferenceLabels = {
  women: 'Women',
  men: 'Men',
  everyone: 'Everyone',
} as const;

const chemistryLabels = {
  banter: 'Banter',
  'deep-talk': 'Deep talk',
  affection: 'Affection',
  adventure: 'Adventure',
} as const;

const lifestyleLabels = {
  social: 'Social',
  homebody: 'Homebody',
  fitness: 'Fitness',
  food: 'Food',
  travel: 'Travel',
  outdoors: 'Outdoors',
  culture: 'Culture',
  family: 'Family',
} as const;

export default function YouScreen() {
  const router = useRouter();

  const {
    heroPhotoReady,
    additionalPhotoCount,
  } = useProfile();

  const [
    memberProfile,
    setMemberProfile,
  ] = useState<MemberProfileProjection | null>(
    null,
  );

  const [
    memberProfileLoading,
    setMemberProfileLoading,
  ] = useState(true);

  const [
    memberProfileError,
    setMemberProfileError,
  ] = useState<string | null>(null);

  const refreshMemberProfile =
    useCallback(async () => {
      setMemberProfileLoading(true);
      setMemberProfileError(null);

      try {
        const profile =
          await loadMyMemberProfile();

        setMemberProfile(profile);
      } catch (caught) {
        setMemberProfileError(
          caught instanceof Error
            ? caught.message
            : 'BTME could not load your profile.',
        );
      } finally {
        setMemberProfileLoading(false);
      }
    }, []);

  useEffect(() => {
    void refreshMemberProfile();
  }, [refreshMemberProfile]);

  const firstName =
    memberProfile?.firstName ?? '';

  const city =
    memberProfile?.city ?? '';

  const distance =
    memberProfile?.distanceMiles ?? 25;

  const relationshipIntent =
    memberProfile?.relationshipIntent ?? null;

  const matchPreference =
    memberProfile?.matchPreference ?? null;

  const minimumAge =
    memberProfile?.minimumAge ?? 18;

  const maximumAge =
    memberProfile?.maximumAge ?? 99;

  const lifestyleSignals =
    memberProfile?.lifestyleSignals ?? [];

  const perfectSunday =
    memberProfile?.perfectSunday ?? '';

  const greenFlag =
    memberProfile?.greenFlag ?? '';

  const absoluteNo =
    memberProfile?.absoluteNo ?? '';

  const chemistryStyle =
    memberProfile?.chemistryStyle ?? null;

  const dealBreakers =
    memberProfile?.dealBreakers ?? [];

  const {
    accessState,
    profileComplete,
    loading: membershipLoading,
    hasActiveMembership,
    isVerified,
    canDate,
    accessMessage,
  } = useMembership();
  const {
    status: verificationStatus,
    verified: identityVerified,
    loading: verificationLoading,
  } = useVerification();

  const verificationPresentation =
    verificationLoading
      ? {
          title: 'Checking verification.',
          body: 'BTME™ is securely checking your live-selfie verification status.',
          status: 'CHECKING VERIFICATION',
        }
      : identityVerified
        ? {
            title: 'BTME Live Verified.',
            body: 'You completed BTME™’s live-camera challenge and your verification status has been confirmed by BTME™ trusted verification infrastructure.',
            status: 'LIVE SELFIE VERIFIED',
          }
        : verificationStatus === 'pending'
          ? {
              title: 'Verification in progress.',
              body: 'Your live-selfie verification has been submitted and is awaiting a trusted result.',
              status: 'VERIFICATION PENDING',
            }
          : verificationStatus === 'needs_review'
            ? {
                title: 'Verification needs review.',
                body: 'Your verification requires additional trusted review before BTME Verified status can be awarded.',
                status: 'REVIEW REQUIRED',
              }
            : verificationStatus === 'failed'
              ? {
                  title: 'Verification not completed.',
                  body: 'Your latest verification attempt was not successful. BTME Verified status has not been awarded.',
                  status: 'NOT VERIFIED',
                }
              : {
                  title: 'Verification not started.',
                  body: 'Your profile is active, but your identity has not yet been verified by BTME™ trusted verification infrastructure.',
                  status: 'NOT VERIFIED',
                };


  const photoCount =
    (heroPhotoReady ? 1 : 0) +
    additionalPhotoCount;

  const completion =
    profileComplete ? 100 : 0;

  const lifestyleText =
    lifestyleSignals.length > 0
      ? lifestyleSignals
          .map((signal) => lifestyleLabels[signal])
          .join(' · ')
      : 'Not set yet';

  return (
    <AppShellScreen
      eyebrow="YOU"
      title={
        firstName
          ? `${firstName}, this is yours.`
          : 'This is yours.'
      }
      body="The profile behind your introductions — what you want, how you connect and the things that matter to you."
    >
      {memberProfileLoading ? (
        <View style={styles.profileStateCard}>
          <Text style={styles.profileStateTitle}>
            Loading your profile…
          </Text>
          <Text style={styles.profileStateBody}>
            BTME is loading your saved profile.
          </Text>
        </View>
      ) : memberProfileError ? (
        <View style={styles.profileStateCard}>
          <Text style={styles.profileStateTitle}>
            Profile unavailable
          </Text>
          <Text style={styles.profileStateBody}>
            {memberProfileError}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry profile"
            onPress={() => {
              void refreshMemberProfile();
            }}
            style={({ pressed }) => [
              styles.profileRetry,
              pressed && styles.manageCardPressed,
            ]}
          >
            <Text style={styles.profileRetryText}>
              Try again
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {firstName
                ? firstName.charAt(0).toUpperCase()
                : '♥'}
            </Text>
          </View>

          <View style={styles.identity}>
            <Text style={styles.name}>
              {firstName || 'Your profile'}
            </Text>

            <Text style={styles.location}>
              {city || 'Location not set'}
            </Text>
          </View>

          <View style={styles.completionBadge}>
            <Text style={styles.completionValue}>
              {completion}%
            </Text>
            <Text style={styles.completionLabel}>
              PROFILE
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${completion}%`,
              },
            ]}
          />
        </View>

        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>
            {photoCount === 0
              ? 'Photos not added'
              : `${photoCount} ${
                  photoCount === 1
                    ? 'photo'
                    : 'photos'
                } in preview`}
          </Text>

          <Text style={styles.heroMetaDot}>
            ·
          </Text>

          <Text style={styles.heroMetaText}>
            {distance} mile discovery radius
          </Text>
        </View>
      </View>

      <Text style={styles.sectionEyebrow}>
        WHAT YOU WANT
      </Text>

      <View style={styles.sectionCard}>
        <ProfileRow
          label="INTENT"
          value={
            relationshipIntent
              ? intentLabels[relationshipIntent]
              : 'Not set yet'
          }
        />

        <Divider />

        <ProfileRow
          label="LOOKING FOR"
          value={
            matchPreference
              ? preferenceLabels[matchPreference]
              : 'Not set yet'
          }
        />

        <Divider />

        <ProfileRow
          label="AGE RANGE"
          value={`${minimumAge}–${maximumAge}`}
        />
      </View>

      <Text style={styles.sectionEyebrow}>
        YOUR VIBE
      </Text>

      <View style={styles.sectionCard}>
        <ProfileRow
          label="LIFESTYLE"
          value={lifestyleText}
        />

        <Divider />

        <ProfileRow
          label="CHEMISTRY"
          value={
            chemistryStyle
              ? chemistryLabels[chemistryStyle]
              : 'Not set yet'
          }
        />
      </View>

      <Text style={styles.sectionEyebrow}>
        THE GOOD STUFF
      </Text>

      <View style={styles.promptStack}>
        <PromptCard
          eyebrow="PERFECT SUNDAY"
          value={
            perfectSunday ||
            'Your answer will appear here.'
          }
        />

        <PromptCard
          eyebrow="GREEN FLAG"
          value={
            greenFlag ||
            'Your answer will appear here.'
          }
        />

        <PromptCard
          eyebrow="ABSOLUTELY NOT"
          value={
            absoluteNo ||
            'Your answer will appear here.'
          }
        />
      </View>

      <Text style={styles.sectionEyebrow}>
        MANAGE
      </Text>

      <View style={styles.manageStack}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Manage profile"
          onPress={() =>
            router.push(
              '/edit-profile' as never,
            )
          }
          style={({ pressed }) => [
            styles.manageCard,
            pressed && styles.manageCardPressed,
          ]}
        >
          <Text style={styles.manageEyebrow}>
            PROFILE
          </Text>

          <Text style={styles.manageTitle}>
            Keep it current.
          </Text>

          <Text style={styles.manageBody}>
            Review your profile, preferences,
            photos and personality.
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() =>
            router.push(
              '/settings' as never,
            )
          }
          style={({ pressed }) => [
            styles.manageCard,
            pressed && styles.manageCardPressed,
          ]}
        >
          <Text style={styles.manageEyebrow}>
            SETTINGS
          </Text>

          <Text style={styles.manageTitle}>
            Your account. Your rules.
          </Text>

          <Text style={styles.manageBody}>
            Membership, privacy, safety and account
            controls.
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionEyebrow}>
        MEMBERSHIP
      </Text>

      <View style={styles.membershipCard}>
        <View style={styles.membershipTop}>
          <View>
            <Text style={styles.membershipTitle}>
              {membershipLoading
                ? 'Checking Premium…'
                : hasActiveMembership
                  ? 'BTME Premium'
                  : 'Premium required'}
            </Text>

            <Text style={styles.membershipBody}>
              {membershipLoading
                ? 'Checking your server-authoritative membership state.'
                : hasActiveMembership
                  ? 'Your Premium entitlement is active and verified.'
                  : accessMessage}
            </Text>
          </View>

          <View style={styles.localPill}>
            <Text style={styles.localPillText}>
              {hasActiveMembership ? 'ACTIVE' : 'LOCKED'}
            </Text>
          </View>
        </View>

        <Text style={styles.membershipDisclosure}>
          {canDate
            ? 'VERIFIED · PREMIUM · READY TO DATE'
            : `${(accessState?.entitlementStatus ?? 'inactive').toUpperCase()} · ${isVerified ? 'VERIFIED' : 'VERIFICATION REQUIRED'}`}
        </Text>
      </View>

      <View style={styles.trustCard}>
        <Text style={styles.trustEyebrow}>
          VERIFICATION & SAFETY
        </Text>

        <Text style={styles.trustTitle}>
          {verificationPresentation.title}
        </Text>
        <Text style={styles.trustBody}>
          {verificationPresentation.body}
        </Text>
        <View style={styles.trustStatus}>
          <View style={styles.trustDot} />
          <Text style={styles.trustStatusText}>
            {verificationPresentation.status}
          </Text>
        </View>

      </View>
        </>
      )}
    </AppShellScreen>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>
        {label}
      </Text>

      <Text style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

function PromptCard({
  eyebrow,
  value,
}: {
  eyebrow: string;
  value: string;
}) {
  return (
    <View style={styles.promptCard}>
      <Text style={styles.promptEyebrow}>
        {eyebrow}
      </Text>

      <Text style={styles.promptValue}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return (
    <View style={styles.divider} />
  );
}

const styles = StyleSheet.create({
  profileStateCard: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  profileStateTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  profileStateBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  profileRetry: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  profileRetryText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  heroCard: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
  },
  identity: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  location: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  completionBadge: {
    minWidth: 62,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  completionValue: {
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
  },
  completionLabel: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  progressTrack: {
    marginTop: spacing.lg,
    height: 4,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  heroMeta: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroMetaText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  heroMetaDot: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sectionEyebrow: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  row: {
    paddingVertical: spacing.md,
  },
  rowLabel: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  rowValue: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  promptStack: {
    gap: spacing.sm,
  },
  promptCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  promptEyebrow: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  promptValue: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
  },
  manageStack: {
    gap: spacing.sm,
  },

  manageCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  manageCardPressed: {
    opacity: 0.72,
  },

  manageEyebrow: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.7,
  },

  manageTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
  },

  manageBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },

  membershipCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  membershipTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  membershipTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  membershipBody: {
    marginTop: spacing.xs,
    maxWidth: 245,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  localPill: {
    marginLeft: 'auto',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  localPillText: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  membershipDisclosure: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  trustCard: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
  },

  trustEyebrow: {
    color: colors.warning,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  trustTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  trustBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  trustStatus: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trustDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  trustStatusText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
