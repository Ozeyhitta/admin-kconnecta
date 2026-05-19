import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@/components/ui", replacement: path.resolve(__dirname, "./src/components/common") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "react-router-dom", replacement: "react-router" },
    ],
  },
  base: "/",
});
