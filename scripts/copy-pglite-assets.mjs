#!/usr/bin/env node
/**
 * Postbuild: PGLite (встроенный Postgres для превью без DATABASE_URL) читает
 * `pglite.data` и `*.wasm` рядом с бандлом. Nitro их не копирует, из-за чего
 * `vite preview` падал с ENOENT. Копируем рядом с бандлом; без сети/папок — тихо выходим.
 */
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@electric-sql", "pglite", "dist");
const dest = join(root, ".vercel", "output", "functions", "__server.func", "_libs");

if (!existsSync(src) || !existsSync(join(root, ".vercel", "output"))) {
  console.log("[pglite-assets] nothing to copy — skipping.");
  process.exit(0);
}

await mkdir(dest, { recursive: true });
let n = 0;
for (const f of await readdir(src)) {
  if (f.endsWith(".data") || f.endsWith(".wasm")) {
    await copyFile(join(src, f), join(dest, f));
    n += 1;
  }
}
console.log(`[pglite-assets] copied ${n} file(s) to ${dest}`);
