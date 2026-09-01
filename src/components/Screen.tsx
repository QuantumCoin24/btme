import {
  ReactNode,
} from 'react';

import {
  StyleSheet,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  colors,
  spacing,
} from '../theme/tokens';

type ScreenProps = {
  children: ReactNode;
  padded?: boolean;
};

export function Screen({
  children,
  padded = true,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={[
          styles.screen,
          padded && styles.padded,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  padded: {
    paddingHorizontal: spacing.lg,
  },
});
