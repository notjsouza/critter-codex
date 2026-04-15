import { apiJson, apiRequest, isApiConfigured } from '../http/apiClient';

type PresignUploadResponse = {
  key: string;
  uploadUrl: string;
  publicUrl?: string;
};

export async function uploadEntryImage(localUri: string): Promise<string> {
  if (!isApiConfigured()) {
    return localUri;
  }

  const presign = await apiJson<PresignUploadResponse>('/uploads/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contentType: 'image/jpeg',
      extension: 'jpg',
    }),
  });

  if (!presign.key || !presign.uploadUrl) {
    throw new Error('Image upload failed: invalid presign response.');
  }

  const response = await fetch(localUri);
  const blob = await response.blob();

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/jpeg',
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Image upload failed (${uploadResponse.status}).`);
  }

  return presign.key;
}

export async function deleteEntryImage(imageKey: string): Promise<void> {
  if (!isApiConfigured()) {
    return;
  }

  const response = await apiRequest(`/uploads?key=${encodeURIComponent(imageKey)}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Delete image failed (${response.status}).`);
  }
}
