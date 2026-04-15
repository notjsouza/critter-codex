import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

import { apiRequest, isApiConfigured } from '../http/apiClient';

const SESSION_STORAGE_KEY = 'crittercodex.auth.session';

type SessionPayload = {
  token: string;
  email?: string;
};

type SignInResponse = {
  token?: string;
  nextStep?: string;
};

type SignUpResponse = {
  nextStep?: string;
};

type HostedSignInResponse = {
  url?: string;
};

function extractTokenFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('token');
  } catch {
    return null;
  }
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function requestOptionalAuthEndpoint(path: string, init: RequestInit): Promise<Response | null> {
  if (!isApiConfigured()) {
    return null;
  }

  try {
    const response = await apiRequest(path, init);
    if (response.status === 404 || response.status === 405) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Auth request failed (${response.status}) for ${path}`);
    }

    return response;
  } catch {
    return null;
  }
}

async function saveSession(payload: SessionPayload) {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
}

async function readSession(): Promise<SessionPayload | null> {
  const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionPayload;
    if (!parsed?.token) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function hasValidSession(): Promise<boolean> {
  const session = await readSession();
  return Boolean(session?.token);
}

export async function startHostedSignIn() {
  const response = await requestOptionalAuthEndpoint('/auth/hosted-sign-in', {
    method: 'POST',
  });
  if (!response) {
    throw new Error('Hosted sign-in endpoint is not available in the current backend.');
  }

  const body = await readJsonResponse<HostedSignInResponse>(response);
  if (!body?.url) {
    throw new Error('Hosted sign-in URL was not returned by backend.');
  }

  const existingUrl = await Linking.getInitialURL();
  const existingToken = existingUrl ? extractTokenFromUrl(existingUrl) : null;
  if (existingToken) {
    await saveSession({ token: existingToken });
    return 'DONE';
  }

  const tokenPromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.remove();
      reject(new Error('Hosted sign-in timed out waiting for app callback.'));
    }, 2 * 60 * 1000);

    const subscription = Linking.addEventListener('url', (event) => {
      const token = extractTokenFromUrl(event.url);
      if (!token) {
        return;
      }

      clearTimeout(timeout);
      subscription.remove();
      resolve(token);
    });
  });

  await Linking.openURL(body.url);

  const token = await tokenPromise;
  await saveSession({ token });
  return 'DONE';
}

export async function performSignOut() {
  await requestOptionalAuthEndpoint('/auth/sign-out', { method: 'POST' });

  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function signUpWithEmail(email: string, password: string) {
  const response = await requestOptionalAuthEndpoint('/auth/sign-up', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response) {
    return 'CONFIRM_SIGN_UP';
  }

  const body = await readJsonResponse<SignUpResponse>(response);
  return body?.nextStep ?? 'CONFIRM_SIGN_UP';
}

export async function confirmEmailSignUp(email: string, code: string) {
  await requestOptionalAuthEndpoint('/auth/confirm-sign-up', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });
}

export async function resendEmailConfirmationCode(email: string) {
  await requestOptionalAuthEndpoint('/auth/resend-confirmation-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
}

export async function signInWithEmail(email: string, password: string) {
  const response = await requestOptionalAuthEndpoint('/auth/sign-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response) {
    await saveSession({
      token: `local-session-${Date.now()}`,
      email,
    });
    return 'DONE';
  }

  const body = await readJsonResponse<SignInResponse>(response);
  if (body?.token) {
    await saveSession({ token: body.token, email });
    return 'DONE';
  }

  return body?.nextStep ?? 'DONE';
}
