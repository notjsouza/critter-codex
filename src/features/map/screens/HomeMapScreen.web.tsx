import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/ui/Screen';
import { useEntriesQuery } from '../../entries/hooks/useEntriesQuery';

export function HomeMapScreen() {
  const { data = [], isLoading, isError } = useEntriesQuery();

  return (
    <Screen>
      <View style={styles.container}>

        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Map view is mobile-only for now</Text>
          <Text style={styles.placeholderText}>
            The native Mapbox view is available in iOS and Android development builds.
          </Text>
          <Text style={styles.placeholderText}>
            Web fallback: use the Entries tab to browse and verify captured sightings.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Sightings</Text>
          {isLoading ? <Text style={styles.statusText}>Loading sightings...</Text> : null}
          {isError ? <Text style={styles.statusErrorText}>Could not load latest sightings.</Text> : null}
          {!isLoading && !isError ? (
            <Text style={styles.statusText}>{data.length} sighting(s) available.</Text>
          ) : null}
        </View>

        <Pressable style={styles.recenterButton} disabled>
          <Text style={styles.recenterButtonText}>Recenter (native only)</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  placeholderCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 14,
    gap: 8,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  placeholderText: {
    color: '#334155',
    lineHeight: 21,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  summaryTitle: {
    fontWeight: '700',
    color: '#0F172A',
  },
  statusText: {
    color: '#334155',
    fontSize: 13,
  },
  statusErrorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  recenterButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  recenterButtonText: {
    fontWeight: '700',
    color: '#0F172A',
  },
});
