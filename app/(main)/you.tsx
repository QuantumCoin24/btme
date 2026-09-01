import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppShellScreen,
} from '../../src/components/AppShellScreen';
import {
  useCompatibility,
} from '../../src/features/compatibility/CompatibilityContext';
import {
  useMembership,
} from '../../src/features/membership/MembershipContext';
import {
  useOnboarding,
} from '../../src/features/onboarding/OnboardingContext';
import {
  useProfile,
} from '../../src/features/profile/ProfileContext';
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

const membershipLabels = {
  monthly: 'Monthly',
  'six-month': '6 Months',
  annual: 'Annual',
} as const;

export default function YouScreen() {
  const {
    firstName,
    city,
    distance,
  } = useOnboarding();

  const {
    heroPhotoReady,
    additionalPhotoCount,
    relationshipIntent,
    matchPreference,
    minimumAge,
    maximumAge,
  } = useProfile();

  const {
    lifestyleSignals,
    perfectSunday,
    greenFlag,
    absoluteNo,
    chemistryStyle,
    dealBreakers,
  } = useCompatibility();

  const {
    selectedPlan,
  } = useMembership();

  const photoCount =
    (heroPhotoReady ? 1 : 0) +
    additionalPhotoCount;

  const completedSignals = [
    Boolean(firstName.trim()),
    Boolean(city.trim()),
    heroPhotoReady,
    Boolean(relationshipIntent),
    Boolean(matchPreference),
    lifestyleSignals.length > 0,
    Boolean(perfectSunday.trim()),
    Boolean(greenFlag.trim()),
    Boolean(absoluteNo.trim()),
    Boolean(chemistryStyle),
    dealBreakers.length > 0,
  ].filter(Boolean).length;

  const completion = Math.round(
    (completedSignals / 11) * 100,
  );

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
        MEMBERSHIP
      </Text>

      <View style={styles.membershipCard}>
        <View style={styles.membershipTop}>
          <View>
            <Text style={styles.membershipTitle}>
              {selectedPlan
                ? `${membershipLabels[selectedPlan]} plan`
                : 'No plan selected'}
            </Text>

            <Text style={styles.membershipBody}>
              {selectedPlan
                ? 'Saved as your local membership preference.'
                : 'Choose a membership plan during the membership preview.'}
            </Text>
          </View>

          <View style={styles.localPill}>
            <Text style={styles.localPillText}>
              LOCAL
            </Text>
          </View>
        </View>

        <Text style={styles.membershipDisclosure}>
          NO PURCHASE · NO ACTIVE ENTITLEMENT
        </Text>
      </View>

      <View style={styles.trustCard}>
        <Text style={styles.trustEyebrow}>
          IDENTITY & SAFETY
        </Text>

        <Text style={styles.trustTitle}>
          Built for trust, not theatre.
        </Text>

        <Text style={styles.trustBody}>
          Your current profile state does not mean
          your identity has been verified. Production
          verification, membership entitlement and
          SafeDate™ services require their own trusted
          systems.
        </Text>

        <View style={styles.trustStatus}>
          <View style={styles.trustDot} />

          <Text style={styles.trustStatusText}>
            PRODUCTION TRUST SYSTEMS NOT ACTIVE
          </Text>
        </View>
      </View>
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
