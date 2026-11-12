import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: false,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    alias: {
      phaser: fileURLToPath(new URL("./src/test/phaserStub.ts", import.meta.url)),
    },
  },
});
