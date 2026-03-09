import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          icons: ["lucide-react"],
          "game-data": [
            "./src/lib/items.ts",
            "./src/lib/spriteRegistry.ts",
            "./src/lib/pokemonDictionary.ts",
            "./src/lib/regions.ts",
            "./src/lib/legendaries.ts",
            "./src/lib/starters.ts",
            "./src/lib/typeChart.ts",
            "./src/lib/gymLeaders.ts",
          ],
        },
      },
    },
  },
});
