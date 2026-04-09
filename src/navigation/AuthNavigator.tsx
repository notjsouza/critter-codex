import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SignInScreen } from '../features/auth/screens/SignInScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

type AuthNavigatorProps = {
  onSignedIn: () => void;
};

export function AuthNavigator({ onSignedIn }: AuthNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn">{() => <SignInScreen onSignedIn={onSignedIn} />}</Stack.Screen>
    </Stack.Navigator>
  );
}
