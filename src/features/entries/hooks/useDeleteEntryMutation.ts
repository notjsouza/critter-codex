import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteEntry } from '../../../services/entries/entriesApi';
import { deleteEntryImage } from '../../../services/storage/imageStorage';
import type { Entry } from '../../../types/entry';
import { entriesQueryKey } from './useEntriesQuery';

export type DeleteEntryResult = {
  id: string;
  imageCleanupFailed: boolean;
};

export function useDeleteEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: Entry): Promise<DeleteEntryResult> => {
      await deleteEntry(entry.id);

      if (!entry.image) {
        return { id: entry.id, imageCleanupFailed: false };
      }

      try {
        await deleteEntryImage(entry.image);
        return { id: entry.id, imageCleanupFailed: false };
      } catch {
        return { id: entry.id, imageCleanupFailed: true };
      }
    },
    onMutate: async (entry) => {
      await queryClient.cancelQueries({ queryKey: entriesQueryKey });

      const previous = queryClient.getQueryData<Entry[]>(entriesQueryKey) ?? [];
      queryClient.setQueryData<Entry[]>(entriesQueryKey, previous.filter((item) => item.id !== entry.id));

      return { previous };
    },
    onError: (_error, _entry, context) => {
      if (!context?.previous) {
        return;
      }

      queryClient.setQueryData(entriesQueryKey, context.previous);
    },
  });
}
