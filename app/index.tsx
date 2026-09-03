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
  supabase,
} from '../src/lib/supabase';
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

  const [minimumSplashElapsed, setMinimumSplashElapsed] =
    useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumSplashElapsed(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!initialized || !minimumSplashElapsed) {
      return;
    }

    let active = true;

    const resolveStartupRoute = async () => {
      if (!configured || !user) {
        if (active) {
          router.replace('/welcome');
        }

        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .select('profile_complete')
        .eq('member_id', user.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error) {
        console.warn(
          '[BTME] Unable to resolve member startup state:',
          error.message,
        );

        return;
      }

      if (data?.profile_complete === true) {
        router.replace('/(main)/discover' as never);
        return;
      }

      router.replace('/birthday');
    };

    void resolveStartupRoute();

    return () => {
      active = false;
    };
  }, [
    configured,
    initialized,
    minimumSplashElapsed,
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
