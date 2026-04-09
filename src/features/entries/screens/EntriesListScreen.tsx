import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/ui/Screen';
import { useEntriesQuery } from '../hooks/useEntriesQuery';

export function EntriesListScreen() {
  const { data = [], isLoading, isError, refetch, isRefetching } = useEntriesQuery();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Recent Sightings</Text>

        {isLoading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="small" color="#0EA5E9" />
            <Text style={styles.stateText}>Loading entries...</Text>
          </View>
        ) : null}

        {isError ? (
          <View style={styles.centeredState}>
            <Text style={styles.errorText}>Could not load entries right now.</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                void refetch();
              }}
            >
              <Text style={styles.retryButtonText}>{isRefetching ? 'Retrying...' : 'Retry'}</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          data={isError ? [] : data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No sightings yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
            </View>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  listContent: {
    gap: 10,
    paddingBottom: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardDescription: {
    marginTop: 6,
    color: '#475569',
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#64748B',
  },
  centeredState: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stateText: {
    color: '#334155',
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  retryButton: {
    borderRadius: 10,
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
