import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
      "/actuator": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: [
      { find: "@/components/ui", replacement: path.resolve(__dirname, "./src/components/common") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "react-router-dom", replacement: "react-router" },
    ],
  },
  base: "/",
});
