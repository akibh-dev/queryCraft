import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "querycraft",
    compatibilityDate: "2026-11-20",
    assets: {
      notFoundHandling: "single-page-application",
    },
  },
});
