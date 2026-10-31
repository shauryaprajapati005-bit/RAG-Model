import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "lucide-react-upstream", replacement: "lucide-react" },
      { find: "lucide-react", replacement: path.resolve(__dirname, "./src/lib/lucide-react.tsx") },
    ],
  },
  server: {
    port: 3000,
    open: true,
  },
});
