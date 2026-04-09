import {
  confirmSignUp,
  fetchAuthSession,
  resendSignUpCode,
  signIn,
  signInWithRedirect,
  signOut,
  signUp,
} from 'aws-amplify/auth';

const isUnsupportedAuthFlowError = (err: unknown) => {
  const name =
    typeof err === 'object' && err && 'name' in err ? String((err as { name?: unknown }).name).toLowerCase() : '';
  const raw =
    typeof err === 'object' && err && 'message' in err
      ? String((err as { message?: unknown }).message)
      : String(err ?? '');

  const message = raw.toLowerCase();
  return (
    (name === 'invalidparameterexception' && message.includes('flow')) ||
    message.includes('not enabled for the client') ||
    message.includes('not enabled for this client') ||
    message.includes('auth flow') ||
    message.includes('unsupported operation')
  );
};

const isRetryableSignInError = (err: unknown) => {
  const name = typeof err === 'object' && err && 'name' in err ? String((err as { name?: unknown }).name) : '';
  const message =
    typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message) : '';

  if (name === 'Unknown' || message.toLowerCase().includes('unknown error')) {
    return true;
  }

  return isUnsupportedAuthFlowError(err);
};

const isDefinitiveSignInError = (err: unknown) => {
  const name = typeof err === 'object' && err && 'name' in err ? String((err as { name?: unknown }).name) : '';

  return [
    'NotAuthorizedException',
    'UserNotConfirmedException',
    'UserNotFoundException',
    'PasswordResetRequiredException',
    'TooManyRequestsException',
    'LimitExceededException',
  ].includes(name);
};

export async function hasValidSession(): Promise<boolean> {
  try {
    const session = await fetchAuthSession();
    return Boolean(session.tokens?.accessToken);
  } catch {
    return false;
  }
}

export async function startHostedSignIn() {
  await signInWithRedirect();
}

export async function performSignOut() {
  await signOut();
}

export async function signUpWithEmail(email: string, password: string) {
  const result = await signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
      },
    },
  });

  return result.nextStep?.signUpStep ?? 'DONE';
}

export async function confirmEmailSignUp(email: string, code: string) {
  await confirmSignUp({
    username: email,
    confirmationCode: code,
  });
}

export async function resendEmailConfirmationCode(email: string) {
  await resendSignUpCode({
    username: email,
  });
}

export async function signInWithEmail(email: string, password: string) {
  const attemptedFlows: Array<{ flow: 'USER_PASSWORD_AUTH' | 'USER_SRP_AUTH' | 'DEFAULT'; error?: string }> = [];

  const attempts: Array<{
    flow: 'USER_PASSWORD_AUTH' | 'USER_SRP_AUTH' | 'DEFAULT';
    authFlowType?: 'USER_PASSWORD_AUTH' | 'USER_SRP_AUTH';
  }> = [
    { flow: 'USER_PASSWORD_AUTH', authFlowType: 'USER_PASSWORD_AUTH' },
    { flow: 'USER_SRP_AUTH', authFlowType: 'USER_SRP_AUTH' },
    { flow: 'DEFAULT' },
  ];

  for (const attempt of attempts) {
    try {
      const result = await signIn({
        username: email,
        password,
        options: attempt.authFlowType ? { authFlowType: attempt.authFlowType } : undefined,
      });

      return result.nextStep?.signInStep ?? 'DONE';
    } catch (err) {
      const name = typeof err === 'object' && err && 'name' in err ? String((err as { name?: unknown }).name) : '';
      const message =
        typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message) : '';

      if (name === 'UserAlreadyAuthenticatedException') {
        return 'DONE';
      }

      attemptedFlows.push({
        flow: attempt.flow,
        error: message || name || 'unknown error',
      });

      if (isDefinitiveSignInError(err)) {
        throw err;
      }

      if (!isRetryableSignInError(err)) {
        throw err;
      }
    }
  }

  const details = attemptedFlows.map((entry) => `${entry.flow}: ${entry.error ?? 'unknown error'}`).join(' | ');
  throw new Error(`Unable to sign in with available auth flows. ${details}`);
}
