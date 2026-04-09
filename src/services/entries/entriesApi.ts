import { generateClient } from 'aws-amplify/api';

import { bootstrapAmplify, isAmplifyConfigured } from '../amplify/bootstrap';
import { mockEntries } from './mockEntries';
import type { Entry } from '../../types/entry';

bootstrapAmplify();
const client = generateClient();
let fallbackEntries: Entry[] = [...mockEntries];

const listEntriesQuery = /* GraphQL */ `
  query ListEntries {
    listEntries {
      items {
        id
        name
        description
        image
        latitude
        longitude
      }
    }
  }
`;

const createEntryMutation = /* GraphQL */ `
  mutation CreateEntry($input: CreateEntryInput!) {
    createEntry(input: $input) {
      id
      name
      description
      image
      latitude
      longitude
    }
  }
`;

const deleteEntryMutation = /* GraphQL */ `
  mutation DeleteEntry($input: DeleteEntryInput!) {
    deleteEntry(input: $input) {
      id
    }
  }
`;

type ListEntriesResponse = {
  listEntries?: {
    items?: Array<Entry | null> | null;
  } | null;
};

type CreateEntryResponse = {
  createEntry?: Entry | null;
};

type DeleteEntryResponse = {
  deleteEntry?: { id: string } | null;
};

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
  if (!isAmplifyConfigured()) {
    return [...fallbackEntries];
  }

  const result = await client.graphql({
    query: listEntriesQuery,
  });

  const items = ((result as { data?: ListEntriesResponse }).data?.listEntries?.items ?? [])
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
  if (!isAmplifyConfigured()) {
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

  const result = await client.graphql({
    query: createEntryMutation,
    variables: { input },
  });

  const created = toEntry((result as { data?: CreateEntryResponse }).data?.createEntry ?? undefined);
  if (!created) {
    throw new Error('Create entry failed: invalid response payload.');
  }

  return created;
}

export async function deleteEntry(id: string): Promise<string> {
  if (!isAmplifyConfigured()) {
    fallbackEntries = fallbackEntries.filter((entry) => entry.id !== id);
    return id;
  }

  const result = await client.graphql({
    query: deleteEntryMutation,
    variables: {
      input: { id },
    },
  });

  const deletedId = (result as { data?: DeleteEntryResponse }).data?.deleteEntry?.id;
  if (!deletedId) {
    throw new Error('Delete entry failed: invalid response payload.');
  }

  return deletedId;
}
