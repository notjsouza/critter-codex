import { NavigationContainer } from '@react-navigation/native';

import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

type RootNavigatorProps = {
  isAuthenticated: boolean;
  onSignedIn: () => void;
  onSignedOut: () => void;
};

export function RootNavigator({ isAuthenticated, onSignedIn, onSignedOut }: RootNavigatorProps) {
  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <AppNavigator onSignedOut={onSignedOut} />
      ) : (
        <AuthNavigator onSignedIn={onSignedIn} />
      )}
    </NavigationContainer>
  );
}
