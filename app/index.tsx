import {
  useEffect,
} from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  BrandMark,
} from '../src/components/BrandMark';

import {
  Screen,
} from '../src/components/Screen';

import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/welcome');
    }, 1800);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Screen>
      <View style={styles.content}>
        <BrandMark />

        <Text style={styles.tagline}>
          Find better. Date better. Love better.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  tagline: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    ...typography.body,
  },
});
