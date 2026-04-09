import { useQuery } from '@tanstack/react-query';

import { listEntries } from '../../../services/entries/entriesApi';

export const entriesQueryKey = ['entries'];

export function useEntriesQuery() {
  return useQuery({
    queryKey: entriesQueryKey,
    queryFn: listEntries,
  });
}
