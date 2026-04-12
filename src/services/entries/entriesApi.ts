import { apiJson, apiRequest, isApiConfigured } from '../http/apiClient';
import { mockEntries } from './mockEntries';
import type { Entry } from '../../types/entry';

let fallbackEntries: Entry[] = [...mockEntries];

type ListEntriesResponse = Entry[] | { items?: Array<Entry | null> | null };

function toEntry(item: Entry | null | undefined): Entry | null {
  if (!item?.id || !item.name) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    image: item.image ?? undefined,
    latitude: item.latitude ?? undefined,
    longitude: item.longitude ?? undefined,
  };
}

export async function listEntries(): Promise<Entry[]> {
  if (!isApiConfigured()) {
    return [...fallbackEntries];
  }

  const response = await apiJson<ListEntriesResponse>('/entries');
  const rawItems = Array.isArray(response) ? response : (response.items ?? []);

  const items = rawItems
    .map((item) => toEntry(item ?? undefined))
    .filter((item): item is Entry => item != null);

  return items;
}

export type CreateEntryInput = {
  name: string;
  description?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
};

export async function createEntry(input: CreateEntryInput): Promise<Entry> {
  if (!isApiConfigured()) {
    const created: Entry = {
      id: String(Date.now()),
      name: input.name,
      description: input.description,
      image: input.image,
      latitude: input.latitude,
      longitude: input.longitude,
    };

    fallbackEntries = [created, ...fallbackEntries];
    return created;
  }

  const created = toEntry(
    await apiJson<Entry>('/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
  );
  if (!created) {
    throw new Error('Create entry failed: invalid response payload.');
  }

  return created;
}

export async function deleteEntry(id: string): Promise<string> {
  if (!isApiConfigured()) {
    fallbackEntries = fallbackEntries.filter((entry) => entry.id !== id);
    return id;
  }

  const response = await apiRequest(`/entries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Delete entry failed (${response.status}).`);
  }

  return id;
}
