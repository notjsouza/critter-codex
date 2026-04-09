import { remove, uploadData } from 'aws-amplify/storage';

import { isAmplifyConfigured } from '../amplify/bootstrap';

function buildImageKey() {
  return `entries/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
}

export async function uploadEntryImage(localUri: string): Promise<string> {
  if (!isAmplifyConfigured()) {
    return localUri;
  }

  const response = await fetch(localUri);
  const blob = await response.blob();
  const imageKey = buildImageKey();

  await uploadData({
    path: imageKey,
    data: blob,
    options: {
      contentType: 'image/jpeg',
    },
  }).result;

  return imageKey;
}

export async function deleteEntryImage(imageKey: string): Promise<void> {
  if (!isAmplifyConfigured()) {
    return;
  }

  await remove({ path: imageKey });
}
