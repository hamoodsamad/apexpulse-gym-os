import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        login: path.resolve(__dirname, "index-login.html"),
        dashboard: path.resolve(__dirname, "index-dashboard.html"),
        members: path.resolve(__dirname, "index-members.html"),
        scanner: path.resolve(__dirname, "index-scanner.html"),
        packages: path.resolve(__dirname, "index-packages.html"),
        payments: path.resolve(__dirname, "index-payments.html"),
        attendance: path.resolve(__dirname, "index-attendance.html"),
        memberPortal: path.resolve(__dirname, "index-member-portal.html"),
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== "true",
  },
});
