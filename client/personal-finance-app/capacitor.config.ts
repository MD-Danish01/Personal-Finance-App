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
  plugins: {
    // CapacitorHttp: enabled so Capacitor intercepts fetch/XHR and applies
    // native network handling (required for some Android WebView quirks).
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
