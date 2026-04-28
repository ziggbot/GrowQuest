import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Vite needs to know it's allowed to read the parent dir (where mockup.jsx lives).
export default defineConfig({
  plugins: [react({ include: /\.(jsx|tsx)$/ })],
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: [resolve(here, ".."), resolve(here, "..", "..")]
    }
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"]
  }
});
