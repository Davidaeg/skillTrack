import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.mts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  esbuildOptions(options) {
    options.alias = {
      "@": "./src",
      "@routes": "./src/routes",
      "@plugins": "./src/plugins",
      "@utils": "./src/utils",
      "@graphql": "./src/graphql",
      "@env": "./src/env.mts",
    };
  },
  outDir: "dist",
});
