import {
  Tabs,
} from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
} from '../../src/theme/tokens';

type TabIconProps = {
  symbol: string;
  focused: boolean;
};

function TabIcon({
  symbol,
  focused,
}: TabIconProps) {
  return (
    <View style={styles.iconWrap}>
      <Text
        style={[
          styles.icon,
          focused && styles.iconFocused,
        ]}
      >
        {symbol}
      </Text>

      {focused && (
        <View style={styles.activeDot} />
      )}
    </View>
  );
}

export default function MainLayout() {
  return (
    <Tabs
      initialRouteName="discover"
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 88,
          paddingTop: 8,
          paddingBottom: 12,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 13,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              symbol="♥"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="connections"
        options={{
          title: 'Connections',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              symbol="✦"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="dates"
        options={{
          title: 'Dates',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              symbol="◇"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="spark/[connectionId]"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="safedate/[datePlanId]"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              symbol="●"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    color: colors.textMuted,
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '700',
  },

  iconFocused: {
    color: colors.accent,
  },

  activeDot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
