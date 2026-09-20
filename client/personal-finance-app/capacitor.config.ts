import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for Personal Finance App.
 *
 * The app is a server-rendered Next.js application with Server Actions, API routes,
 * and server-side auth — a static export is not compatible. Capacitor loads the
 * live hosted URL in its WebView so all server features continue to work normally.
 *
 * To build the APK:
 *   1. npm run build:mobile   (builds Next.js + syncs Capacitor)
 *   2. npx cap open android   (opens Android Studio)
 *   3. Build > Generate Signed Bundle / APK inside Android Studio
 */
const config: CapacitorConfig = {
  appId: "me.danishdev.devforge.personalfinance",
  appName: "Personal Finance",

  // Point the WebView at the live hosted web app.
  // Remove / comment out `server.url` to bundle a local static build instead.
  server: {
    url: "https://devforge.danishdev.me",
    cleartext: false, // HTTPS only; set to true only for HTTP dev servers
  },

  webDir: "out", // used when building a local static export (fallback)

  android: {
    allowMixedContent: false,
    backgroundColor: "#f8fafc",
  },

  ios: {
    // Match the app's light-mode background so the area behind the WebView
    // never shows a white flash on launch.
    backgroundColor: "#f8fafc",

    // Allow the WebView to scroll under the status bar / home indicator.
    // Our CSS uses env(safe-area-inset-*) to compensate.
    contentInset: "always",

    // Prevent the native scroll bounce from competing with the SPA router.
    scrollEnabled: false,

    // Capacitor 6: the WebView presents over the full screen including
    // the status bar; our layout already accounts for safe areas.
    limitsNavigationsToAppBoundDomains: true,
  },

  plugins: {
    // CapacitorHttp: enabled so Capacitor intercepts fetch/XHR and applies
    // native network handling (required for both Android and iOS WebView).
    CapacitorHttp: {
      enabled: true,
    },

    SplashScreen: {
      // Use the same emerald brand colour as the Android splash
      backgroundColor: "#10b981",
      // Prevent the splash from auto-hiding before the WebView is ready
      launchAutoHide: false,
      showSpinner: false,
    },
  },
};

export default config;
