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

const HP4_ASSET_IMPORT = "/hp4-assets/shoulak-ui/v1/all.css";
const HP4_ASSET_IMPORT_PLACEHOLDER =
  "https://farm-chores.local.invalid/hp4-assets/shoulak-ui/v1/all.css";

export default defineConfig({
  plugins: [react(), runtimeCssImports(), sharedAssetFallback()],
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

function runtimeCssImports() {
  return {
    name: "runtime-css-imports",
    enforce: "pre",
    // Vite resolves root-relative CSS @imports as filesystem paths during
    // build. Treat this import as external, then restore the runtime URL.
    transform(code, id) {
      if (!id.endsWith(".css") || !code.includes(HP4_ASSET_IMPORT)) {
        return null;
      }

      return code.replaceAll(HP4_ASSET_IMPORT, HP4_ASSET_IMPORT_PLACEHOLDER);
    },
    generateBundle(options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== "asset" || typeof asset.source !== "string") {
          continue;
        }

        asset.source = asset.source.replaceAll(
          HP4_ASSET_IMPORT_PLACEHOLDER,
          HP4_ASSET_IMPORT,
        );
      }
    },
  };
}

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
