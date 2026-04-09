import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import { Buffer } from 'buffer';
import { registerRootComponent } from 'expo';

import App from './App';

const globalScope = globalThis as {
	Buffer?: typeof Buffer;
	process?: { env?: Record<string, string | undefined> };
};

if (!globalScope.Buffer) {
	globalScope.Buffer = Buffer;
}

if (!globalScope.process) {
	globalScope.process = { env: {} };
} else if (!globalScope.process.env) {
	globalScope.process.env = {};
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
