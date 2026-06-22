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
      includeAssets: ["icon.svg", "favicon.svg"],
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
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico,woff2}"],
        navigateFallback: "/index.html",
        importScripts: ["/sw-notification-click.js"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co"),
            handler: "NetworkFirst",
            options: { cacheName: "supabase", networkTimeoutSeconds: 5 }
          }
        ]
      }
    })
  ],
  server: { port: 5173, host: true }
});
