import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/ui/Screen';
import type { Entry } from '../../../types/entry';
import { useDeleteEntryMutation } from '../hooks/useDeleteEntryMutation';
import { useEntriesQuery } from '../hooks/useEntriesQuery';

function isDisplayableImageUri(uri: string) {
  return /^https?:\/\//.test(uri) || /^file:\/\//.test(uri) || /^data:image\//.test(uri);
}

export function EntriesListScreen() {
  const { data = [], isLoading, isError, refetch, isRefetching } = useEntriesQuery();
  const deleteMutation = useDeleteEntryMutation();

  const handleDelete = (entry: Entry) => {
    Alert.alert('Delete sighting?', 'This will remove the entry from the map and list.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              const result = await deleteMutation.mutateAsync(entry);
              if (result.imageCleanupFailed) {
                Alert.alert('Entry deleted', 'Entry was deleted, but image cleanup failed.');
              }
            } catch {
              Alert.alert('Delete failed', 'Could not delete this entry. Please try again.');
            }
          })();
        },
      },
    ]);
  };

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
              <View style={styles.cardRow}>
                {item.image ? (
                  <View style={styles.thumbnailWrap}>
                    {isDisplayableImageUri(item.image) ? (
                      <Image source={{ uri: item.image }} style={styles.thumbnailImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Text style={styles.thumbnailPlaceholderText}>IMG</Text>
                      </View>
                    )}
                  </View>
                ) : null}

                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
                </View>

                <Pressable
                  style={styles.deleteButton}
                  disabled={deleteMutation.isPending}
                  onPress={() => {
                    handleDelete(item);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTextWrap: {
    flex: 1,
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
  thumbnailWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  thumbnailPlaceholderText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
});
