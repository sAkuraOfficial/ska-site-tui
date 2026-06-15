#!/usr/bin/env bun

import { createSolidTransformPlugin } from "@opentui/solid/bun-plugin"
import { resolve } from "node:path"

const dir = resolve(import.meta.dir)

const plugin = createSolidTransformPlugin()

const result = await Bun.build({
  entrypoints: [resolve(dir, "src/index.tsx")],
  tsconfig: resolve(dir, "tsconfig.json"),
  plugins: [plugin],
  outdir: resolve(dir, "dist"),
  target: "bun",
  external: ["@opentui/core-*"],
  define: {},
})

if (!result.success) {
  console.error("Build failed:")
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log("Build succeeded! Output: dist/index.js")
