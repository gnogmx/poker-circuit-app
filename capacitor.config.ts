import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gnog.pokercircuit',
  appName: 'Poker Circuit',
  webDir: 'dist/client',
  server: {
    url: 'https://poker-circuit-app.fernando-fcd.workers.dev',
    cleartext: true
  }
};

export default config;
