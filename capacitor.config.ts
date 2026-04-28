import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.familydesk.app',
  appName: 'Family Desk',
  webDir: 'dist',
  server: {
    url: "https://3862c136-3a8c-457d-b6f8-bd3654b2fade.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#5B8C7A",
      sound: "beep.wav",
    },
    Camera: {
      // iOS permission strings (Info.plist) — see ios/App/App/Info.plist
      // Android permissions auto-added by @capacitor/camera plugin
    },
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
