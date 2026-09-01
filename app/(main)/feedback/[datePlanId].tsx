import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  useState,
} from 'react';
import {
  useDiscovery,
} from '../../../src/features/discovery/DiscoveryContext';
import {
  DateFeeling,
  SeeAgainChoice,
  useFeedback,
} from '../../../src/features/feedback/FeedbackContext';
import {
  useSafeDate,
} from '../../../src/features/safedate/SafeDateContext';
import {
  colors,
  radius,
  spacing,
} from '../../../src/theme/tokens';

const SEE_AGAIN_OPTIONS: {
  value: SeeAgainChoice;
  label: string;
}[] = [
  {
    value: 'yes',
    label: 'Yes ❤️‍🔥',
  },
  {
    value: 'maybe',
    label: 'Maybe',
  },
  {
    value: 'no',
    label: 'No',
  },
];

const FEELING_OPTIONS: {
  value: DateFeeling;
  label: string;
}[] = [
  {
    value: 'great',
    label: 'Great',
  },
  {
    value: 'good',
    label: 'Good',
  },
  {
    value: 'not-for-me',
    label: 'Not for me',
  },
];

export default function FeedbackScreen() {
  const router = useRouter();

  const {
    datePlanId: rawDatePlanId,
  } = useLocalSearchParams<{
    datePlanId?: string | string[];
  }>();

  const datePlanId =
    Array.isArray(rawDatePlanId)
      ? rawDatePlanId[0]
      : rawDatePlanId;

  const {
    datePlans,
    getConnection,
  } = useDiscovery();

  const {
    getSessionForDatePlan,
  } = useSafeDate();

  const {
    getReflectionForDatePlan,
    saveLocalReflection,
  } = useFeedback();

  const plan =
    datePlans.find(
      (item) => item.id === datePlanId,
    ) ?? null;

  const connection = plan
    ? getConnection(plan.connectionId)
    : null;

  const session = datePlanId
    ? getSessionForDatePlan(datePlanId)
    : null;

  const existingReflection = datePlanId
    ? getReflectionForDatePlan(datePlanId)
    : null;

  const [
    seeAgain,
    setSeeAgain,
  ] = useState<SeeAgainChoice | null>(
    existingReflection?.seeAgain ?? null,
  );

  const [
    feeling,
    setFeeling,
  ] = useState<DateFeeling | null>(
    existingReflection?.feeling ?? null,
  );

  const [
    note,
    setNote,
  ] = useState(
    existingReflection?.note ?? '',
  );

  if (!plan || !connection) {
    return (
      <View style={styles.screen}>
        <View style={styles.missingWrap}>
          <Text style={styles.eyebrow}>
            PRIVATE REFLECTION
          </Text>

          <Text style={styles.missingTitle}>
            Date unavailable.
          </Text>

          <Text style={styles.body}>
            This local reflection needs an
            existing date plan.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              Go back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const safeDateEnded =
    session?.status === 'ended';

  const canSave =
    safeDateEnded &&
    seeAgain !== null &&
    feeling !== null;

  function handleSave() {
    if (
      !plan ||
      !seeAgain ||
      !feeling ||
      !safeDateEnded
    ) {
      return;
    }

    saveLocalReflection(
      plan.id,
      plan.connectionId,
      seeAgain,
      feeling,
      note,
    );
  }

  const savedReflection =
    getReflectionForDatePlan(plan.id);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.brand}>
            <Text style={styles.heart}>
              ♥
            </Text>

            <Text style={styles.brandText}>
              BTME™
            </Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>
          PRIVATE REFLECTION
        </Text>

        <Text style={styles.title}>
          So... how was it?
        </Text>

        <Text style={styles.body}>
          This is your private post-date
          reflection about your experience with{' '}
          {connection.profile.firstName}.
        </Text>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {connection.profile.accent}
            </Text>
          </View>

          <View style={styles.identity}>
            <Text style={styles.name}>
              {connection.profile.firstName}
            </Text>

            <Text style={styles.dateDetail}>
              {plan.day} · {plan.time}
            </Text>

            <Text style={styles.place}>
              {plan.place}
            </Text>
          </View>
        </View>

        {!safeDateEnded && (
          <View style={styles.lockCard}>
            <Text style={styles.lockEyebrow}>
              REFLECTION LOCKED
            </Text>

            <Text style={styles.lockTitle}>
              End your SafeDate™ preview first.
            </Text>

            <Text style={styles.lockBody}>
              Post-date reflection becomes
              available after your local
              SafeDate side has ended.
            </Text>
          </View>
        )}

        <View
          style={[
            styles.questionCard,
            !safeDateEnded &&
              styles.cardDisabled,
          ]}
        >
          <Text style={styles.questionNumber}>
            01
          </Text>

          <Text style={styles.questionTitle}>
            Would you see them again?
          </Text>

          <Text style={styles.questionBody}>
            Your answer is about what you want.
            It does not imply anything about
            their answer.
          </Text>

          <View style={styles.optionRow}>
            {SEE_AGAIN_OPTIONS.map(
              (option) => {
                const selected =
                  seeAgain === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                      disabled: !safeDateEnded,
                    }}
                    disabled={!safeDateEnded}
                    onPress={() =>
                      setSeeAgain(option.value)
                    }
                    style={({ pressed }) => [
                      styles.option,
                      selected &&
                        styles.optionSelected,
                      pressed &&
                        safeDateEnded &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
        </View>

        <View
          style={[
            styles.questionCard,
            !safeDateEnded &&
              styles.cardDisabled,
          ]}
        >
          <Text style={styles.questionNumber}>
            02
          </Text>

          <Text style={styles.questionTitle}>
            How did the date feel?
          </Text>

          <Text style={styles.questionBody}>
            No stars. No public rating. Just
            your private reflection.
          </Text>

          <View style={styles.optionRow}>
            {FEELING_OPTIONS.map(
              (option) => {
                const selected =
                  feeling === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                      disabled: !safeDateEnded,
                    }}
                    disabled={!safeDateEnded}
                    onPress={() =>
                      setFeeling(option.value)
                    }
                    style={({ pressed }) => [
                      styles.option,
                      selected &&
                        styles.optionSelected,
                      pressed &&
                        safeDateEnded &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
        </View>

        <View
          style={[
            styles.questionCard,
            !safeDateEnded &&
              styles.cardDisabled,
          ]}
        >
          <Text style={styles.questionNumber}>
            03
          </Text>

          <Text style={styles.questionTitle}>
            Anything you want to remember?
          </Text>

          <Text style={styles.questionBody}>
            Optional. Keep a note for your own
            local preview.
          </Text>

          <TextInput
            accessibilityLabel="Private date reflection note"
            editable={safeDateEnded}
            multiline
            maxLength={500}
            onChangeText={setNote}
            placeholder="The vibe, what clicked, what didn’t..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            textAlignVertical="top"
            value={note}
          />

          <Text style={styles.characterCount}>
            {note.length}/500
          </Text>
        </View>

        <View style={styles.boundaryCard}>
          <Text style={styles.boundaryEyebrow}>
            PRIVATE PREVIEW BOUNDARY
          </Text>

          <Text style={styles.boundaryTitle}>
            This stays with you.
          </Text>

          <Text style={styles.boundaryBody}>
            This preview stores your reflection
            only in local app state. It is not
            sent to your date, published,
            submitted as a report, or used to
            create a public rating or popularity
            score.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save private reflection locally"
          accessibilityState={{
            disabled: !canSave,
          }}
          disabled={!canSave}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.primaryButton,
            !canSave && styles.disabledButton,
            pressed &&
              canSave &&
              styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {savedReflection
              ? 'Update my reflection'
              : 'Save my reflection'}
          </Text>
        </Pressable>

        {savedReflection && (
          <View style={styles.savedCard}>
            <View style={styles.savedDot} />

            <View style={styles.savedContent}>
              <Text style={styles.savedTitle}>
                Reflection saved locally
              </Text>

              <Text style={styles.savedBody}>
                Only your answer is represented.
                Nothing about{' '}
                {connection.profile.firstName}
                {' '}is inferred.
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.footerDisclosure}>
          PRIVATE REFLECTION · LOCAL STATE ONLY
          · NOT SHARED · NO PUBLIC RATING · NO
          REPORT SUBMITTED
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    marginTop: -3,
    color: colors.textPrimary,
    fontSize: 31,
    lineHeight: 34,
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  heart: {
    color: colors.accent,
    fontSize: 18,
    lineHeight: 21,
  },

  brandText: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  eyebrow: {
    marginTop: spacing.xl,
    color: colors.accent,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },

  title: {
    maxWidth: 330,
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '900',
    letterSpacing: -1.1,
  },

  body: {
    maxWidth: 340,
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },

  missingWrap: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },

  missingTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },

  identityCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },

  identity: {
    marginLeft: spacing.md,
    flex: 1,
  },

  name: {
    color: colors.textPrimary,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
  },

  dateDetail: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  place: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },

  lockCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },

  lockEyebrow: {
    color: colors.warning,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  lockTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },

  lockBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },

  questionCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  cardDisabled: {
    opacity: 0.52,
  },

  questionNumber: {
    color: colors.accent,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  questionTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },

  questionBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },

  optionRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  option: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },

  optionText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },

  optionTextSelected: {
    color: colors.textPrimary,
  },

  input: {
    minHeight: 116,
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },

  characterCount: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'right',
  },

  boundaryCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },

  boundaryEyebrow: {
    color: colors.accent,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  boundaryTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },

  boundaryBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  primaryButton: {
    minHeight: 56,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },

  secondaryButton: {
    minHeight: 52,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.38,
  },

  buttonPressed: {
    opacity: 0.78,
  },

  savedCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  savedDot: {
    width: 8,
    height: 8,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: colors.success,
  },

  savedContent: {
    marginLeft: spacing.sm,
    flex: 1,
  },

  savedTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },

  savedBody: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },

  footerDisclosure: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 8,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});
