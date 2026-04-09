import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/ui/Screen';

export function CapturePlaceholderScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Capture</Text>
        <Text style={styles.body}>
          Camera + create-entry flow will be added next. This placeholder keeps navigation and MVP wiring ready.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  body: {
    color: '#475569',
    lineHeight: 22,
  },
});
