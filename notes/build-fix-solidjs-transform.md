# 修复记录：构建产物 SolidJS Context 失效

**日期：** 2026-06-16  
**问题：** `bun .\dist\index.js` 运行报错 `useDialog must be used within a DialogProvider`  
**根因：** 构建时缺少 SolidJS 转换插件，导致 bundle 打入了 SolidJS 的 SSR 版本

---

## 现象

Dev 模式（`bun dev`）运行正常，但构建后的 JS 文件运行时抛出：

```
useDialog must be used within a DialogProvider
  at useDialog (dist\index.js:64112:20)
  at KeyboardHandler (dist\index.js:64307:27)
  at App (dist\index.js:64357:31)
```

组件树结构是正确的（`ThemeProvider > DialogProvider > KeyboardHandler`），但 `useContext(ctx)` 返回 `undefined`。

## 根因分析

### 构建命令的问题

原始 `package.json` 中的构建命令：

```json
"build": "bun build src/index.tsx --outdir ./dist --target bun --external \"@opentui/core-*\""
```

这个命令直接调用 `bun build`，**没有加载任何 Bun 插件**。

### SolidJS 的 server.js vs solid.js

`solid-js` 包含两个主要入口：

| 文件 | 用途 |
|------|------|
| `solid-js/dist/solid.js` | 通用/客户端版本，支持 reactive context、effect 等 |
| `solid-js/dist/server.js` | SSR 版本，一次性同步渲染，context 行为不同 |

`@opentui/solid` 的 Bun 插件（`createSolidTransformPlugin`）在加载时会**拦截** `solid-js/dist/server.js`，将其**重定向**为 `solid-js/dist/solid.js`：

```ts
// @opentui/solid/bun-plugin 的 onLoad 拦截逻辑
build.onLoad({ filter: /[/\\]solid-js[/\\]dist[/\\]server\.js$/ }, async (args) => {
  const path = args.path.replace("server.js", "solid.js")
  const code = await Bun.file(path).text()
  return { contents: code, loader: "js" }
})
```

### Dev 模式为什么正常

`bunfig.toml` 中配置了：

```toml
preload = ["@opentui/solid/preload"]
```

`@opentui/solid/preload` 在进程启动时注册了 `bun-plugin-solid`，运行时拦截 JSX 文件和 solid-js 入口，所以 dev 模式能正常工作。

### 构建时为什么不生效

`bun build` CLI 命令不会自动加载 `bunfig.toml` 的 `preload`，也不会使用已注册的运行时插件。需要**显式**将插件传给 `Bun.build()` 的 `plugins` 选项。

## 验证：构建产物中的差异

### 修复前（server.js 版本）

```js
// node_modules/solid-js/dist/server.js  ← 错误！
function createProvider(id) {
  return function provider(props) {
    return createMemo(() => {
      Owner.context = { ...Owner.context, [id]: props.value }
      return children(() => props.children)
    })
  }
}
```

### 修复后（solid.js 版本）

```js
// node_modules/solid-js/dist/solid.js  ← 正确！
function createProvider(id, options) {
  return function provider(props) {
    let res
    createRenderEffect(() => res = untrack(() => {
      Owner.context = { ...Owner.context, [id]: props.value }
      return children(() => props.children)
    }), undefined)
    return res
  }
}
```

关键区别：server.js 使用 `createMemo`，solid.js 使用 `createRenderEffect`。后者是 opentui reconciler 所需的 reactive 运行时。

## 修复方案

### 1. 新建 `build.ts`

```ts
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
})

if (!result.success) {
  console.error("Build failed:")
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

console.log("Build succeeded! Output: dist/index.js")
```

### 2. 更新 `package.json`

```diff
- "build": "bun build src/index.tsx --outdir ./dist --target bun --external \"@opentui/core-*\""
+ "build": "bun run build.ts"
```

## 参考

- opencode CLI 构建脚本：`opencode/packages/cli/script/build.ts`
- solid-plugin 源码：`opentui/packages/solid/scripts/solid-plugin.ts`
- solid-js 区分 server/solid 的原因：[SolidJS 文档 - Rendering Modes](https://docs.solidjs.com/concepts/rendering-modes)

## 总结

使用 `@opentui/solid` 构建 TUI 应用时，**必须**在 `Bun.build()` 中传入 `createSolidTransformPlugin()` 插件。该插件同时负责：

1. 将 `solid-js/dist/server.js` 重定向为 `solid-js/dist/solid.js`（正确的 reactive 运行时）
2. 将 `.tsx` 文件用 `babel-preset-solid` 转换为 SolidJS 运行时调用
