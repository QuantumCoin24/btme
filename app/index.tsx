import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.mark}>♥</Text>

        <Text style={styles.brand}>BTME™</Text>

        <Text style={styles.name}>
          BETTER THAN MY EX™
        </Text>

        <Text style={styles.tagline}>
          Find better. Date better. Love better.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050505',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  mark: {
    fontSize: 38,
    marginBottom: 20,
    color: '#FF315C',
  },

  brand: {
    color: '#FFFFFF',
    fontSize: 58,
    fontWeight: '700',
    letterSpacing: 3,
  },

  name: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    textAlign: 'center',
  },

  tagline: {
    marginTop: 22,
    color: '#A9A9A9',
    fontSize: 15,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
