import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createEntry, type CreateEntryInput } from '../../../services/entries/entriesApi';
import { deleteEntryImage, uploadEntryImage } from '../../../services/storage/imageStorage';
import type { Entry } from '../../../types/entry';
import { entriesQueryKey } from './useEntriesQuery';

export type CreateEntryWithImageInput = Omit<CreateEntryInput, 'image'> & {
  imageUri: string;
};

export type CreateEntryWithImageErrorCode =
  | 'upload_failed'
  | 'create_failed_cleanup_succeeded'
  | 'create_failed_cleanup_failed';

export class CreateEntryWithImageError extends Error {
  code: CreateEntryWithImageErrorCode;

  constructor(code: CreateEntryWithImageErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function useCreateEntryWithImageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEntryWithImageInput) => {
      let imageKey = '';

      try {
        imageKey = await uploadEntryImage(input.imageUri);
      } catch {
        throw new CreateEntryWithImageError('upload_failed', 'Image upload failed.');
      }

      try {
        return await createEntry({
          name: input.name,
          description: input.description,
          latitude: input.latitude,
          longitude: input.longitude,
          image: imageKey,
        });
      } catch {
        try {
          await deleteEntryImage(imageKey);
          throw new CreateEntryWithImageError(
            'create_failed_cleanup_succeeded',
            'Entry create failed after image upload. Uploaded image was cleaned up.'
          );
        } catch {
          throw new CreateEntryWithImageError(
            'create_failed_cleanup_failed',
            'Entry create failed after image upload and image cleanup also failed.'
          );
        }
      }
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Entry[]>(entriesQueryKey, (previous = []) => [created, ...previous]);
    },
  });
}
