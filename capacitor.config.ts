import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eremkin.ritena',
  appName: 'RITENA',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: '#1A3026',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F2EDE2',
      overlaysWebView: false,
    },
  },
};

export default config;
