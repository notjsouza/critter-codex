import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { RootNavigator } from '../navigation/RootNavigator';
import { hasValidSession } from '../services/amplify/auth';
import { bootstrapAmplify } from '../services/amplify/bootstrap';
import { AppProviders } from './AppProviders';

export function RootApp() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    bootstrapAmplify();

    async function init() {
      const hasSession = await hasValidSession();
      setIsAuthenticated(hasSession);
      setIsLoading(false);
    }

    void init();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <AppProviders>
      <RootNavigator
        isAuthenticated={isAuthenticated}
        onSignedIn={() => setIsAuthenticated(true)}
        onSignedOut={() => setIsAuthenticated(false)}
      />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
});
