import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createEntry, type CreateEntryInput } from '../../../services/entries/entriesApi';
import { entriesQueryKey } from './useEntriesQuery';
import type { Entry } from '../../../types/entry';

export function useCreateEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEntryInput) => createEntry(input),
    onSuccess: (created) => {
      queryClient.setQueryData<Entry[]>(entriesQueryKey, (previous = []) => [created, ...previous]);
    },
  });
}
