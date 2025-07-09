import { defineConfig } from "tsx";

export default defineConfig({
  esbuild: {
    alias: {
      "@": "./src",
      "@routes": "./src/routes",
      "@plugins": "./src/plugins",
      "@utils": "./src/utils",
      "@graphql": "./src/graphql",
      "@env": "./src/env.ts",
    },
  },
});
