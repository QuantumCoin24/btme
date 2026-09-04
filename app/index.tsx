import {
  useEffect,
  useState,
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
  useAuth,
} from '../src/features/auth/AuthContext';
import {
  useMembership,
} from '../src/features/membership/MembershipContext';
import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

export default function SplashScreen() {
  const router = useRouter();

  const {
    configured,
    initialized,
    user,
  } = useAuth();

  const {
    accessState,
    loading: accessLoading,
    error: accessError,
    refreshMembership,
  } = useMembership();

  const [
    minimumSplashElapsed,
    setMinimumSplashElapsed,
  ] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumSplashElapsed(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (
      !initialized ||
      !minimumSplashElapsed
    ) {
      return;
    }

    if (!configured || !user) {
      router.replace('/welcome');
      return;
    }

    if (accessLoading) {
      return;
    }

    if (accessError || !accessState) {
      return;
    }

    if (!accessState.profileComplete) {
      router.replace('/birthday');
      return;
    }

    router.replace(
      '/(main)/discover' as never,
    );
  }, [
    accessError,
    accessLoading,
    accessState,
    configured,
    initialized,
    minimumSplashElapsed,
    refreshMembership,
    router,
    user,
  ]);

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
