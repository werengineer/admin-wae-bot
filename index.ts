import { registerRootComponent } from 'expo';

// the background task must be defined at the start, in the global scope (see src/background.ts)
import './src/background';
import { setupNotifications } from './src/notify';
import App from './App';

setupNotifications();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
