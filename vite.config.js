import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const frontendRoot = fileURLToPath(new URL("./app/frontend", import.meta.url));

export default defineConfig({
  root: frontendRoot,
  plugins: [react({ include: /\.[jt]sx?$/ })],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./app/frontend/src", import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
});
