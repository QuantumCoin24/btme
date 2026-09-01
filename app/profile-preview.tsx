import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  OnboardingScreen,
} from '../src/components/OnboardingScreen';

import {
  BrandMark,
} from '../src/components/BrandMark';

import {
  useCompatibility,
} from '../src/features/compatibility/CompatibilityContext';

import {
  useOnboarding,
} from '../src/features/onboarding/OnboardingContext';

import {
  useProfile,
} from '../src/features/profile/ProfileContext';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../src/theme/tokens';

const intentLabels = {
  relationship: 'A relationship',
  'life-partner': 'A life partner',
  'intentional-dating': 'Dating with intention',
  'open-genuine': 'Something genuine',
} as const;

const preferenceLabels = {
  women: 'Women',
  men: 'Men',
  everyone: 'Everyone',
} as const;

const chemistryLabels = {
  banter: 'Make me laugh',
  'deep-talk': 'Talk until 2am',
  affection: 'Warm and affectionate',
  adventure: 'Let’s go somewhere',
} as const;

export default function ProfilePreviewScreen() {
  const {
    firstName,
    city,
  } = useOnboarding();

  const {
    relationshipIntent,
    matchPreference,
    minimumAge,
    maximumAge,
  } = useProfile();

  const {
    perfectSunday,
    greenFlag,
    absoluteNo,
    chemistryStyle,
    dealBreakers,
  } = useCompatibility();

  const intent =
    relationshipIntent
      ? intentLabels[
          relationshipIntent
        ]
      : 'Not selected';

  const preference =
    matchPreference
      ? preferenceLabels[
          matchPreference
        ]
      : 'Not selected';

  const chemistry =
    chemistryStyle
      ? chemistryLabels[
          chemistryStyle
        ]
      : 'Not selected';

  return (
    <OnboardingScreen
      footer={
        <View style={styles.footerNote}>
          <Text style={styles.footerTitle}>
            Profile foundation complete. ❤️‍🔥
          </Text>

          <Text style={styles.footerBody}>
            Membership comes next.
          </Text>
        </View>
      }
    >
      <View style={styles.content}>
        <View style={styles.brand}>
          <BrandMark compact />
        </View>

        <Text style={styles.eyebrow}>
          PROFILE PREVIEW
        </Text>

        <Text style={styles.title}>
          Looking good. ❤️‍🔥
        </Text>

        <Text style={styles.identity}>
          {firstName || 'You'}
          {city ? ` · ${city}` : ''}
        </Text>

        <View style={styles.hero}>
          <View style={styles.photoCircle}>
            <Text style={styles.photoText}>
              ✓
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Your hero photo
          </Text>

          <Text style={styles.heroBody}>
            Photo media is still simulated in this build.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            LOOKING FOR
          </Text>

          <Text style={styles.sectionValue}>
            {intent}
          </Text>

          <Text style={styles.secondary}>
            {preference} · {minimumAge}–{maximumAge}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            PERFECT SUNDAY
          </Text>

          <Text style={styles.sectionValue}>
            {perfectSunday}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            GREEN FLAG
          </Text>

          <Text style={styles.sectionValue}>
            {greenFlag}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            ABSOLUTELY NOT
          </Text>

          <Text style={styles.sectionValue}>
            {absoluteNo}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            QUICK CHEMISTRY
          </Text>

          <Text style={styles.sectionValue}>
            {chemistry}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            HARD DEAL-BREAKERS
          </Text>

          <Text style={styles.secondary}>
            {dealBreakers.length === 0
              ? 'None selected'
              : `${dealBreakers.length} selected`}
          </Text>
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  brand: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
  },

  eyebrow: {
    color: colors.accent,
    ...typography.eyebrow,
    marginBottom: spacing.md,
  },

  title: {
    color: colors.textPrimary,
    ...typography.title,
  },

  identity: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },

  hero: {
    marginTop: spacing.xl,
    minHeight: 230,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  photoCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoText: {
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
  },

  heroTitle: {
    marginTop: spacing.lg,
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },

  heroBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  section: {
    marginTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.lg,
  },

  sectionLabel: {
    color: colors.accent,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 1.6,
  },

  sectionValue: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
  },

  secondary: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  footerNote: {
    minHeight: 74,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  footerTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  footerBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
