import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text } from 'react-native';

import { CaptureScreen } from '../features/capture/screens/CaptureScreen';
import { EntriesListScreen } from '../features/entries/screens/EntriesListScreen';
import { HomeMapScreen } from '../features/map/screens/HomeMapScreen';
import { performSignOut } from '../services/amplify/auth';
import type { AppTabsParamList } from './types';

const Tabs = createBottomTabNavigator<AppTabsParamList>();

type AppNavigatorProps = {
  onSignedOut: () => void;
};

export function AppNavigator({ onSignedOut }: AppNavigatorProps) {
  const handleSignOut = async () => {
    try {
      await performSignOut();
    } finally {
      onSignedOut();
    }
  };

  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { color: '#0F172A' },
      }}
    >
      <Tabs.Screen
        name="HomeMap"
        component={HomeMapScreen}
        options={{
          title: 'Map',
          headerRight: () => (
            <Pressable
              onPress={() => {
                void handleSignOut();
              }}
              hitSlop={10}
            >
              <Text style={{ color: '#0EA5E9', fontWeight: '700' }}>Sign out</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="EntriesList" component={EntriesListScreen} options={{ title: 'Entries' }} />
      <Tabs.Screen
        name="Capture"
        component={CaptureScreen}
        options={{ title: 'Capture' }}
      />
    </Tabs.Navigator>
  );
}
