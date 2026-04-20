import { defineConfig } from "vite";

// GitHub Pages project site lives at /GeometryOfMusic/. Cloudflare Pages and
// Vercel serve at the root — override VITE_BASE at build time if needed.
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
