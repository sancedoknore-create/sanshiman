import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";
import { copyFileSync, existsSync, mkdirSync } from "fs";

// 把 src/main 下的静态资源（HTML / preload-for-popup）拷贝到产物中
function copyMainStaticPlugin() {
  return {
    name: "copy-main-static",
    closeBundle() {
      const outDir = resolve(__dirname, "out/main");
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      for (const f of ["seedance-assets.html", "seedance-assets-preload.js"]) {
        const src = resolve(__dirname, "src/main", f);
        if (existsSync(src)) copyFileSync(src, resolve(outDir, f));
      }
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyMainStaticPlugin()],
    build: {
      outDir: "out/main",
      emptyOutDir: true,
      lib: {
        entry: resolve(__dirname, "src/main/index.js"),
        formats: ["cjs"],
      },
      rollupOptions: {
        output: {
          entryFileNames: "index.js",
          format: "cjs",
        },
      },
      minify: false,
      sourcemap: false,
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      emptyOutDir: true,
      lib: {
        entry: resolve(__dirname, "src/preload/index.js"),
        formats: ["cjs"],
      },
      rollupOptions: {
        output: {
          entryFileNames: "index.js",
          format: "cjs",
        },
      },
      minify: false,
      sourcemap: false,
    },
  },
  // 不配置 renderer：保留 out/renderer/ 现有产物不被覆盖
});
