import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Gastos internos TQM",
        short_name: "Gastos TQM",
        description: "Gestión interna de gastos y kilometraje — TQM Food",
        theme_color: "#1C2536",
        background_color: "#ECEEF2",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // Los datos son siempre en vivo desde Google Drive: no cachear llamadas a la API ni a las funciones de Netlify
        navigateFallbackDenylist: [/^\/\.netlify\//],
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"]
      }
    })
  ],
  server: {
    port: 5173
  }
});
