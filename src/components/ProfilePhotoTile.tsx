import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  radius,
  spacing,
} from '../theme/tokens';

type ProfilePhotoTileProps = {
  uri?: string | null;
  label: string;
  busy?: boolean;
  hero?: boolean;
  onPress: () => void;
  onRemove?: () => void;
};

export function ProfilePhotoTile({
  uri,
  label,
  busy = false,
  hero = false,
  onPress,
  onRemove,
}: ProfilePhotoTileProps) {
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onPress}
        style={styles.shell}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.empty}>
            <View style={styles.icon}>
              <Text style={styles.plus}>+</Text>
            </View>
            <Text style={styles.label}>{label}</Text>
          </View>
        )}

        {hero && uri ? (
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              HERO
            </Text>
          </View>
        ) : null}

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator />
          </View>
        ) : null}
      </Pressable>

      {uri && onRemove ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onRemove}
          style={styles.remove}
        >
          <Text style={styles.removeText}>
            Remove
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 170,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: 220,
  },
  empty: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    color: colors.textPrimary,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '700',
  },
  label: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  heroBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  remove: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  removeText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
