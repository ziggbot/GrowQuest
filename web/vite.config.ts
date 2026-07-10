import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace("T", " "))
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Rise",
        short_name: "Rise",
        description: "Familjens uppdrag, mynt och skärmtid.",
        theme_color: "#fff4dc",
        background_color: "#fff4dc",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "sv",
        icons: [
          // PNGs are what Android/Chrome install prompts actually use;
          // full-bleed so the platform's maskable crop looks right.
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico,woff2}"],
        navigateFallback: "/index.html",
        importScripts: ["/sw-notification-click.js"]
        // Deliberately NO runtimeCaching of *.supabase.co: those GET
        // responses carry family data (balances, emails, photos) and
        // would persist in Cache Storage after sign-out on a shared
        // device. Static assets are precached above; API data is
        // network-only.
      }
    })
  ],
  server: { port: 5173, host: true }
});
