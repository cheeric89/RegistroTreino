import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export default defineConfig({
  plugins: [react(), {
    name: "treino-offline-screens",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const source = readFileSync(new URL("./public/sw.js", import.meta.url), "utf8");
      const assets = ["/", "/manifest.webmanifest", "/favicon.png", ...Object.keys(bundle)
        .filter((name) => /\.(js|css)$/.test(name)).sort().map((name) => `/${name}`)];
      const buildId = createHash("sha256").update(source + JSON.stringify(assets))
        .update(readFileSync(new URL("./public/manifest.webmanifest", import.meta.url)))
        .update(readFileSync(new URL("./public/favicon.png", import.meta.url)))
        .update(readFileSync(new URL("./index.html", import.meta.url)))
        .digest("hex").slice(0, 12);
      this.emitFile({ type: "asset", fileName: "sw.js", source:
        `self.__TREINO_BUILD_ID__ = "${buildId}";\nself.__TREINO_PRECACHE_URLS__ = ${JSON.stringify(assets)};\n${source}` });
    },
  }],
});
