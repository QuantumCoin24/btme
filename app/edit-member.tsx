import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  supabase,
} from '../src/lib/supabase';
import {
  colors,
  radius,
  spacing,
} from '../src/theme/tokens';

type Section =
  | 'name'
  | 'location'
  | 'intent'
  | 'lifestyle'
  | 'prompts';

type RelationshipIntent =
  | 'relationship'
  | 'life-partner'
  | 'intentional-dating'
  | 'open-genuine';

type MatchPreference =
  | 'women'
  | 'men'
  | 'everyone';

type LifestyleSignal =
  | 'social'
  | 'homebody'
  | 'fitness'
  | 'food'
  | 'travel'
  | 'outdoors'
  | 'culture'
  | 'family';

type ChemistryStyle =
  | 'banter'
  | 'deep-talk'
  | 'affection'
  | 'adventure';

type DealBreaker =
  | 'relationship-goals'
  | 'smoking'
  | 'children'
  | 'distance'
  | 'non-monogamy'
  | 'lifestyle';

const DISTANCES = [10, 25, 50, 100] as const;

const INTENTS: Array<{
  value: RelationshipIntent;
  label: string;
}> = [
  { value: 'relationship', label: 'A relationship' },
  { value: 'life-partner', label: 'A life partner' },
  { value: 'intentional-dating', label: 'Dating with intention' },
  { value: 'open-genuine', label: 'Something genuine' },
];

const MATCHES: Array<{
  value: MatchPreference;
  label: string;
}> = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'everyone', label: 'Everyone' },
];

const LIFESTYLE: Array<{
  value: LifestyleSignal;
  label: string;
}> = [
  { value: 'social', label: 'Social butterfly' },
  { value: 'homebody', label: 'Cosy nights' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'food', label: 'Food lover' },
  { value: 'travel', label: 'Travel' },
  { value: 'outdoors', label: 'Outdoors' },
  { value: 'culture', label: 'Culture' },
  { value: 'family', label: 'Family time' },
];

const CHEMISTRY: Array<{
  value: ChemistryStyle;
  label: string;
}> = [
  { value: 'banter', label: 'Make me laugh' },
  { value: 'deep-talk', label: 'Talk until 2am' },
  { value: 'affection', label: 'Warm and affectionate' },
  { value: 'adventure', label: 'Let’s go somewhere' },
];

const DEAL_BREAKERS: Array<{
  value: DealBreaker;
  label: string;
}> = [
  {
    value: 'relationship-goals',
    label: 'Different relationship goals',
  },
  { value: 'smoking', label: 'Smoking' },
  {
    value: 'children',
    label: 'Different plans for children',
  },
  { value: 'distance', label: 'Long-distance only' },
  { value: 'non-monogamy', label: 'Non-monogamy' },
  {
    value: 'lifestyle',
    label: 'Major lifestyle mismatch',
  },
];

function kilometresToMiles(km: number) {
  return Math.max(
    1,
    Math.round(km / 1.609344),
  );
}

function milesToKilometres(miles: number) {
  return Math.round(miles * 1.609344);
}

function firstString(
  value: string | string[] | undefined,
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function isSection(
  value: string | undefined,
): value is Section {
  return (
    value === 'name' ||
    value === 'location' ||
    value === 'intent' ||
    value === 'lifestyle' ||
    value === 'prompts'
  );
}

export default function EditMemberScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    section?: string | string[];
  }>();

  const rawSection = firstString(params.section);
  const section: Section =
    isSection(rawSection)
      ? rawSection
      : 'name';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const [firstName, setFirstName] =
    useState('');
  const [city, setCity] =
    useState('');
  const [distanceMiles, setDistanceMiles] =
    useState(25);

  const [
    relationshipIntent,
    setRelationshipIntent,
  ] = useState<RelationshipIntent | null>(
    null,
  );

  const [
    matchPreference,
    setMatchPreference,
  ] = useState<MatchPreference | null>(
    null,
  );

  const [minimumAge, setMinimumAge] =
    useState(18);
  const [maximumAge, setMaximumAge] =
    useState(99);

  const [
    lifestyleSignals,
    setLifestyleSignals,
  ] = useState<LifestyleSignal[]>([]);

  const [
    chemistryStyle,
    setChemistryStyle,
  ] = useState<ChemistryStyle | null>(
    null,
  );

  const [perfectSunday, setPerfectSunday] =
    useState('');
  const [greenFlag, setGreenFlag] =
    useState('');
  const [absoluteNo, setAbsoluteNo] =
    useState('');

  const [dealBreakers, setDealBreakers] =
    useState<DealBreaker[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const user = authData.user;

        if (!user) {
          throw new Error(
            'You must be signed in to edit your profile.',
          );
        }

        const [
          profileResult,
          preferenceResult,
          compatibilityResult,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('first_name, city')
            .eq('member_id', user.id)
            .single(),
          supabase
            .from('member_preferences')
            .select(
              'relationship_intent, looking_for, minimum_age, maximum_age, distance_km',
            )
            .eq('member_id', user.id)
            .single(),
          supabase
            .from('compatibility_profiles')
            .select(
              'lifestyle_signals, perfect_sunday, green_flag, absolute_no, chemistry_style, deal_breakers',
            )
            .eq('member_id', user.id)
            .single(),
        ]);

        if (profileResult.error) {
          throw profileResult.error;
        }

        if (preferenceResult.error) {
          throw preferenceResult.error;
        }

        if (compatibilityResult.error) {
          throw compatibilityResult.error;
        }

        if (!active) {
          return;
        }

        const profile = profileResult.data;
        const preferences =
          preferenceResult.data;
        const compatibility =
          compatibilityResult.data;

        setFirstName(
          typeof profile.first_name === 'string'
            ? profile.first_name
            : '',
        );

        setCity(
          typeof profile.city === 'string'
            ? profile.city
            : '',
        );

        setDistanceMiles(
          typeof preferences.distance_km === 'number'
            ? kilometresToMiles(
                preferences.distance_km,
              )
            : 25,
        );

        setRelationshipIntent(
          preferences.relationship_intent as
            | RelationshipIntent
            | null,
        );

        const lookingFor =
          Array.isArray(preferences.looking_for)
            ? preferences.looking_for
            : [];

        setMatchPreference(
          (lookingFor[0] ?? null) as
            | MatchPreference
            | null,
        );

        setMinimumAge(
          typeof preferences.minimum_age ===
            'number'
            ? preferences.minimum_age
            : 18,
        );

        setMaximumAge(
          typeof preferences.maximum_age ===
            'number'
            ? preferences.maximum_age
            : 99,
        );

        setLifestyleSignals(
          Array.isArray(
            compatibility.lifestyle_signals,
          )
            ? compatibility.lifestyle_signals as
                LifestyleSignal[]
            : [],
        );

        setPerfectSunday(
          typeof compatibility.perfect_sunday ===
            'string'
            ? compatibility.perfect_sunday
            : '',
        );

        setGreenFlag(
          typeof compatibility.green_flag ===
            'string'
            ? compatibility.green_flag
            : '',
        );

        setAbsoluteNo(
          typeof compatibility.absolute_no ===
            'string'
            ? compatibility.absolute_no
            : '',
        );

        setChemistryStyle(
          compatibility.chemistry_style as
            | ChemistryStyle
            | null,
        );

        setDealBreakers(
          Array.isArray(
            compatibility.deal_breakers,
          )
            ? compatibility.deal_breakers as
                DealBreaker[]
            : [],
        );
      } catch (caught) {
        if (!active) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : 'BTME could not load your profile.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const valid = useMemo(() => {
    switch (section) {
      case 'name':
        return firstName.trim().length >= 2;

      case 'location':
        return (
          city.trim().length >= 2 &&
          distanceMiles > 0
        );

      case 'intent':
        return Boolean(
          relationshipIntent &&
            matchPreference &&
            minimumAge >= 18 &&
            maximumAge >= minimumAge,
        );

      case 'lifestyle':
        return Boolean(
          lifestyleSignals.length >= 2 &&
            chemistryStyle,
        );

      case 'prompts':
        return (
          perfectSunday.trim().length >= 10 &&
          greenFlag.trim().length >= 6 &&
          absoluteNo.trim().length >= 6
        );
    }
  }, [
    section,
    firstName,
    city,
    distanceMiles,
    relationshipIntent,
    matchPreference,
    minimumAge,
    maximumAge,
    lifestyleSignals,
    chemistryStyle,
    perfectSunday,
    greenFlag,
    absoluteNo,
  ]);

  const save = async () => {
    if (saving || !valid) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user = authData.user;

      if (!user) {
        throw new Error(
          'You must be signed in to edit your profile.',
        );
      }

      if (section === 'name') {
        const { error: updateError } =
          await supabase
            .from('profiles')
            .update({
              first_name: firstName.trim(),
            })
            .eq('member_id', user.id);

        if (updateError) {
          throw updateError;
        }
      }

      if (section === 'location') {
        const profileUpdate =
          await supabase
            .from('profiles')
            .update({
              city: city.trim(),
            })
            .eq('member_id', user.id);

        if (profileUpdate.error) {
          throw profileUpdate.error;
        }

        const preferenceUpdate =
          await supabase
            .from('member_preferences')
            .update({
              distance_km:
                milesToKilometres(
                  distanceMiles,
                ),
            })
            .eq('member_id', user.id);

        if (preferenceUpdate.error) {
          throw preferenceUpdate.error;
        }
      }

      if (section === 'intent') {
        const { error: updateError } =
          await supabase
            .from('member_preferences')
            .update({
              relationship_intent:
                relationshipIntent,
              looking_for: [
                matchPreference,
              ],
              minimum_age: minimumAge,
              maximum_age: maximumAge,
            })
            .eq('member_id', user.id);

        if (updateError) {
          throw updateError;
        }
      }

      if (section === 'lifestyle') {
        const { error: updateError } =
          await supabase
            .from('compatibility_profiles')
            .update({
              lifestyle_signals:
                lifestyleSignals,
              chemistry_style:
                chemistryStyle,
              deal_breakers:
                dealBreakers,
            })
            .eq('member_id', user.id);

        if (updateError) {
          throw updateError;
        }
      }

      if (section === 'prompts') {
        const { error: updateError } =
          await supabase
            .from('compatibility_profiles')
            .update({
              perfect_sunday:
                perfectSunday.trim(),
              green_flag:
                greenFlag.trim(),
              absolute_no:
                absoluteNo.trim(),
            })
            .eq('member_id', user.id);

        if (updateError) {
          throw updateError;
        }
      }

      router.replace(
        '/(main)/edit-profile' as never,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'BTME could not save your changes.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleLifestyle = (
    value: LifestyleSignal,
  ) => {
    setLifestyleSignals((current) =>
      current.includes(value)
        ? current.filter(
            (item) => item !== value,
          )
        : [...current, value],
    );
  };

  const toggleDealBreaker = (
    value: DealBreaker,
  ) => {
    setDealBreakers((current) =>
      current.includes(value)
        ? current.filter(
            (item) => item !== value,
          )
        : [...current, value],
    );
  };

  const title =
    section === 'name'
      ? 'Your name'
      : section === 'location'
        ? 'Your dating area'
        : section === 'intent'
          ? 'What you want'
          : section === 'lifestyle'
            ? 'Lifestyle & chemistry'
            : 'The good stuff';

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
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <Text style={styles.brand}>
            BTME™
          </Text>
        </View>

        <Text style={styles.eyebrow}>
          EDIT PROFILE
        </Text>

        <Text style={styles.title}>
          {title}
        </Text>

        <Text style={styles.body}>
          Your saved profile is loaded from BTME.
          Changes here update this section only.
        </Text>

        {loading ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Loading your profile…
            </Text>
          </View>
        ) : null}

        {!loading && section === 'name' ? (
          <View style={styles.card}>
            <Text style={styles.label}>
              FIRST NAME
            </Text>
            <TextInput
              autoCapitalize="words"
              autoComplete="name-given"
              maxLength={40}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={
                colors.textMuted
              }
              style={styles.input}
            />
          </View>
        ) : null}

        {!loading &&
        section === 'location' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>
                CITY
              </Text>
              <TextInput
                autoCapitalize="words"
                value={city}
                onChangeText={setCity}
                placeholder="Manchester"
                placeholderTextColor={
                  colors.textMuted
                }
                style={styles.input}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>
                DISCOVERY DISTANCE
              </Text>

              <View style={styles.wrap}>
                {DISTANCES.map((value) => (
                  <Option
                    key={value}
                    label={
                      value === 100
                        ? '100+ miles'
                        : `${value} miles`
                    }
                    selected={
                      distanceMiles === value
                    }
                    onPress={() =>
                      setDistanceMiles(value)
                    }
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {!loading && section === 'intent' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>
                RELATIONSHIP INTENTION
              </Text>
              <View style={styles.stack}>
                {INTENTS.map((option) => (
                  <Option
                    key={option.value}
                    label={option.label}
                    selected={
                      relationshipIntent ===
                      option.value
                    }
                    onPress={() =>
                      setRelationshipIntent(
                        option.value,
                      )
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>
                LOOKING FOR
              </Text>
              <View style={styles.wrap}>
                {MATCHES.map((option) => (
                  <Option
                    key={option.value}
                    label={option.label}
                    selected={
                      matchPreference ===
                      option.value
                    }
                    onPress={() =>
                      setMatchPreference(
                        option.value,
                      )
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>
                AGE RANGE
              </Text>

              <View style={styles.ageRow}>
                <AgeControl
                  label="MIN"
                  value={minimumAge}
                  onMinus={() =>
                    setMinimumAge(
                      Math.max(
                        18,
                        minimumAge - 1,
                      ),
                    )
                  }
                  onPlus={() =>
                    setMinimumAge(
                      Math.min(
                        maximumAge,
                        minimumAge + 1,
                      ),
                    )
                  }
                />

                <AgeControl
                  label="MAX"
                  value={maximumAge}
                  onMinus={() =>
                    setMaximumAge(
                      Math.max(
                        minimumAge,
                        maximumAge - 1,
                      ),
                    )
                  }
                  onPlus={() =>
                    setMaximumAge(
                      Math.min(
                        99,
                        maximumAge + 1,
                      ),
                    )
                  }
                />
              </View>
            </View>
          </>
        ) : null}

        {!loading &&
        section === 'lifestyle' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>
                YOUR VIBE
              </Text>

              <View style={styles.wrap}>
                {LIFESTYLE.map((option) => (
                  <Option
                    key={option.value}
                    label={option.label}
                    selected={lifestyleSignals.includes(
                      option.value,
                    )}
                    onPress={() =>
                      toggleLifestyle(
                        option.value,
                      )
                    }
                  />
                ))}
              </View>

              <Text style={styles.note}>
                {lifestyleSignals.length}{' '}
                selected — choose at least two.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>
                QUICK CHEMISTRY
              </Text>

              <View style={styles.stack}>
                {CHEMISTRY.map((option) => (
                  <Option
                    key={option.value}
                    label={option.label}
                    selected={
                      chemistryStyle ===
                      option.value
                    }
                    onPress={() =>
                      setChemistryStyle(
                        option.value,
                      )
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>
                HARD DEAL-BREAKERS
              </Text>

              <View style={styles.stack}>
                {DEAL_BREAKERS.map(
                  (option) => (
                    <Option
                      key={option.value}
                      label={option.label}
                      selected={dealBreakers.includes(
                        option.value,
                      )}
                      onPress={() =>
                        toggleDealBreaker(
                          option.value,
                        )
                      }
                    />
                  ),
                )}
              </View>
            </View>
          </>
        ) : null}

        {!loading && section === 'prompts' ? (
          <>
            <PromptEditor
              label="PERFECT SUNDAY"
              value={perfectSunday}
              onChangeText={setPerfectSunday}
              placeholder="Coffee, a long walk, roast dinner…"
            />

            <PromptEditor
              label="GREEN FLAG"
              value={greenFlag}
              onChangeText={setGreenFlag}
              placeholder="Kind to people when nobody is watching…"
            />

            <PromptEditor
              label="ABSOLUTELY NOT"
              value={absoluteNo}
              onChangeText={setAbsoluteNo}
              placeholder="Rudeness dressed up as confidence…"
            />
          </>
        ) : null}

        {error ? (
          <Text
            accessibilityRole="alert"
            style={styles.error}
          >
            {error}
          </Text>
        ) : null}

        {!loading ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: saving || !valid,
            }}
            disabled={saving || !valid}
            onPress={() => {
              void save();
            }}
            style={({ pressed }) => [
              styles.saveButton,
              (saving || !valid) &&
                styles.disabled,
              pressed &&
                !saving &&
                valid &&
                styles.pressed,
            ]}
          >
            <Text style={styles.saveText}>
              {saving
                ? 'Saving…'
                : 'Save changes'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Option({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.option,
        selected && styles.optionSelected,
      ]}
    >
      <Text
        style={[
          styles.optionText,
          selected &&
            styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AgeControl({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.ageBox}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.ageValue}>
        {value}
      </Text>

      <View style={styles.ageButtons}>
        <Pressable
          onPress={onMinus}
          style={styles.ageButton}
        >
          <Text style={styles.ageButtonText}>
            −
          </Text>
        </Pressable>

        <Pressable
          onPress={onPlus}
          style={styles.ageButton}
        >
          <Text style={styles.ageButtonText}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function PromptEditor({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        multiline
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          styles.promptInput,
        ]}
      />
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
    color: colors.textPrimary,
    fontSize: 30,
  },
  brand: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  eyebrow: {
    marginTop: spacing.xl,
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  title: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '800',
  },
  body: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  input: {
    marginTop: spacing.md,
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontSize: 17,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  promptInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  wrap: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stack: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  option: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  optionText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: colors.textPrimary,
  },
  note: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  ageRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  ageBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    padding: spacing.md,
    alignItems: 'center',
  },
  ageValue: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
  },
  ageButtons: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  ageButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageButtonText: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  error: {
    marginTop: spacing.lg,
    color: colors.accent,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: spacing.xl,
    minHeight: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
});
