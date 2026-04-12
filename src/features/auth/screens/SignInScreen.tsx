import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../../components/ui/Screen';
import {
  confirmEmailSignUp,
  resendEmailConfirmationCode,
  signInWithEmail,
  signUpWithEmail,
  startHostedSignIn,
} from '../../../services/amplify/auth';

type SignInScreenProps = {
  onSignedIn: () => void;
};

export function SignInScreen({ onSignedIn }: SignInScreenProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const getDebugErrorDetails = (err: unknown) => {
    if (!err || typeof err !== 'object') {
      return '';
    }

    const e = err as {
      name?: unknown;
      message?: unknown;
      recoverySuggestion?: unknown;
      code?: unknown;
      cause?: unknown;
    };

    const parts = [
      e.name ? `name=${String(e.name)}` : '',
      e.code ? `code=${String(e.code)}` : '',
      e.message ? `message=${String(e.message)}` : '',
      e.recoverySuggestion ? `suggestion=${String(e.recoverySuggestion)}` : '',
      e.cause ? `cause=${String(e.cause)}` : '',
    ].filter(Boolean);

    return parts.join(' | ');
  };

  const getAuthErrorMessage = (err: unknown, fallback: string) => {
    const name = typeof err === 'object' && err && 'name' in err ? String((err as { name?: unknown }).name) : '';
    const msg =
      typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message) : '';

    if (name === 'UserNotConfirmedException') {
      return 'This account is not confirmed yet. Enter code and confirm first.';
    }

    if (name === 'CodeMismatchException') {
      return 'That confirmation code is invalid. Please check and try again.';
    }

    if (name === 'ExpiredCodeException') {
      return 'That confirmation code expired. Request a new code and try again.';
    }

    if (name === 'UsernameExistsException') {
      return 'An account already exists for this email. Try sign in or confirm account.';
    }

    if (name === 'NotAuthorizedException') {
      return 'Incorrect email or password.';
    }

    if (name === 'UserAlreadyAuthenticatedException') {
      return 'This user is already signed in. Try reopening the app.';
    }

    if (msg && msg.toLowerCase().includes('unknown error')) {
      const debug = getDebugErrorDetails(err);
      return debug ? `${fallback} (${debug})` : msg;
    }

    if (msg) {
      return msg;
    }

    const debug = getDebugErrorDetails(err);
    if (debug) {
      return `${fallback} (${debug})`;
    }

    return fallback;
  };

  const validateInputs = () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return false;
    }

    return true;
  };

  const handleEmailSignIn = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!validateInputs()) {
      setLoading(false);
      return;
    }

    try {
      const signInStep = await signInWithEmail(email.trim(), password);

      if (signInStep === 'DONE') {
        onSignedIn();
        return;
      }

      setError(`Sign-in is waiting on next step: ${signInStep}.`);
    } catch (err) {
      console.error('Email sign-in failed', err);
      setError(getAuthErrorMessage(err, 'Sign in failed. If this is a new account, create one first.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!validateInputs()) {
      setLoading(false);
      return;
    }

    try {
      const step = await signUpWithEmail(email.trim(), password);
      if (step === 'CONFIRM_SIGN_UP') {
        setShowConfirm(true);
        setMessage('Account created. Enter the email confirmation code to continue.');
      } else {
        setMessage('Account created. You can now sign in.');
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Could not create account. Check email/password policy and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!code.trim()) {
      setError('Confirmation code is required.');
      setLoading(false);
      return;
    }

    try {
      await confirmEmailSignUp(email.trim(), code.trim());
      const signInStep = await signInWithEmail(email.trim(), password);
      if (signInStep === 'DONE') {
        onSignedIn();
      } else {
        setError(`Account confirmed, but sign-in needs next step: ${signInStep}.`);
      }
    } catch (err) {
      console.error('Confirmation/sign-in failed', err);
      setError(getAuthErrorMessage(err, 'Could not confirm account. Verify the code and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError('Email is required to resend confirmation code.');
      setLoading(false);
      return;
    }

    try {
      await resendEmailConfirmationCode(email.trim());
      setMessage('A new confirmation code was sent to your email.');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Could not resend confirmation code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const step = await startHostedSignIn();
      if (step === 'DONE') {
        onSignedIn();
      }
    } catch {
      setError('Could not start hosted sign-in. Check backend auth setup and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>CritterCodex</Text>
        <Text style={styles.subtitle}>Sign in to discover and log critter sightings.</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />

        {showConfirm ? (
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Email confirmation code"
            keyboardType="number-pad"
          />
        ) : null}

        <Pressable style={styles.button} onPress={handleEmailSignIn} disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign In With Email</Text>}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </Pressable>

        {showConfirm ? (
          <Pressable style={styles.secondaryButton} onPress={handleConfirm} disabled={loading}>
            <Text style={styles.secondaryButtonText}>Confirm Account</Text>
          </Pressable>
        ) : null}

        {showConfirm ? (
          <Pressable style={styles.secondaryButton} onPress={handleResendCode} disabled={loading}>
            <Text style={styles.secondaryButtonText}>Resend Code</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.secondaryButton} onPress={handleSignIn} disabled={loading}>
          <Text style={styles.secondaryButtonText}>Use Hosted Sign-In</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  error: {
    color: '#B91C1C',
  },
  message: {
    color: '#0F766E',
  },
});
