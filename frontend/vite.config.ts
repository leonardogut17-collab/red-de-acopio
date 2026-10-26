import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 3000,
    // En desarrollo, las peticiones a /api se reenvían al backend Express
    proxy: { "/api": { target: "http://localhost:4000", changeOrigin: true } },
  },
  preview: { port: 3000 },
  build: {
    outDir: "dist",
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          map: ["leaflet", "react-leaflet"],
        },
      },
    },
  },
});
