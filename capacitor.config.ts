import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flightlevels.atctrainer',
  appName: 'ATC Trainer',
  webDir: 'out',
  server: {
    url: 'https://practice.flight-levels.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
