import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HP4_ASSETS_TARGET =
  globalThis.process?.env?.FARM_HP4_ASSETS_TARGET || "http://192.168.20.24:8088";
const SHARED_ASSET_FALLBACK_ROOT =
  globalThis.process?.env?.FARM_SHARED_ASSET_FALLBACK_ROOT ||
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../hypervisor/frontend/public/assets",
  );

export default defineConfig({
  plugins: [react(), sharedAssetFallback()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:3001",
      "/hp4-assets": {
        target: HP4_ASSETS_TARGET,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/hp4-assets/, ""),
      },
    },
  },
});

function contentTypeForAsset(assetPath) {
  if (assetPath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (assetPath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }

  return "application/octet-stream";
}

function sharedAssetFallback() {
  return {
    name: "shared-asset-fallback",
    configureServer(server) {
      server.middlewares.use("/hp4-assets/", async (request, response, next) => {
        if (!request.url) {
          next();
          return;
        }

        const requestPath = request.url.split("?")[0].replace(/^\/+/, "");

        if (!requestPath.startsWith("shoulak-ui/")) {
          next();
          return;
        }

        const assetPath = path.normalize(requestPath);
        const absolutePath = path.resolve(SHARED_ASSET_FALLBACK_ROOT, assetPath);

        if (!absolutePath.startsWith(SHARED_ASSET_FALLBACK_ROOT)) {
          next();
          return;
        }

        try {
          const body = await fs.readFile(absolutePath);
          response.setHeader("content-type", contentTypeForAsset(assetPath));
          response.setHeader("cache-control", "no-store");
          response.end(body);
        } catch {
          next();
        }
      });
    },
  };
}
