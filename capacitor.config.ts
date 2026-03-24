import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.familydesk.app',
  appName: 'Family Desk',
  webDir: 'dist',
  server: {
    url: "https://3862c136-3a8c-457d-b6f8-bd3654b2fade.lovableproject.com?forceHideBadge=true",
    cleartext: true
  }
};

export default config;
