# Markdown 代码块语法高亮实现总结

## 技术栈

- **框架**: SolidJS + OpenTUI（`@opentui/core` + `@opentui/solid`）
- **运行模式**: SSH Server（`@opentui/ssh` 的 `createServer`）
- **解析引擎**: Tree-sitter（WASM，浏览器/运行时内解析）

## 核心原理

OpenTUI 内置了 `<markdown>` 组件，底层使用 Tree-sitter 进行语法高亮。`@opentui/core` 已经**内置打包**了以下语言的解析器（本地 WASM）：

- JavaScript / JSX
- TypeScript / TSX
- Markdown / Markdown_inline
- Zig

内置解析器定义在 `@opentui/core/src/lib/tree-sitter/parsers-config.ts` 中，包含 `injectionMapping` 用于在 markdown 代码块中自动识别语言并注入对应的语法高亮。

## 实现方式

### 1. index.tsx — 注册额外解析器（可选）

内置解析器已覆盖 JS/TS/Markdown，如需支持更多语言（如 json、diff），使用 `getTreeSitterClient().addFiletypeParser()` 注册：

```typescript
import { getTreeSitterClient } from "@opentui/core"

const treeSitterClient = getTreeSitterClient()
treeSitterClient.addFiletypeParser({
  filetype: "json",
  wasm: "https://github.com/tree-sitter/tree-sitter-json/releases/download/v0.24.8/tree-sitter-json.wasm",
  queries: {
    highlights: ["https://raw.githubusercontent.com/nvim-treesitter/nvim-treesitter/refs/heads/master/queries/json/highlights.scm"],
  },
})
treeSitterClient.addFiletypeParser({
  filetype: "diff",
  wasm: "https://github.com/tree-sitter-grammars/tree-sitter-diff/releases/download/v0.1.0/tree-sitter-diff.wasm",
  queries: {
    highlights: ["https://raw.githubusercontent.com/tree-sitter-grammars/tree-sitter-diff/master/queries/highlights.scm"],
  },
})
```

### 2. PostDetail.tsx — 渲染 Markdown

```tsx
import { SyntaxStyle } from "@opentui/core"

// 使用 fromStyles() 创建扁平的 token → 颜色映射（与官方 demo 一致）
const syntaxStyle = SyntaxStyle.fromStyles({
  keyword: "#FF7B72",
  string: "#A5D6FF",
  number: "#79C0FF",
  comment: { fg: "#8B949E", italic: true },
  operator: "#FF7B72",
  punctuation: "#C9D1D9",
  function: "#D2A8FF",
  type: "#79C0FF",
  variable: "#E6EDF3",
  constant: "#79C0FF",
  property: "#79C0FF",
  parameter: "#E6EDF3",
  class: "#FFA657",
  "markup.heading": { fg: "#E6EDF3", bold: true },
  "markup.bold": { bold: true },
  "markup.italic": { italic: true },
  "markup.link": "#58A6FF",
  tag: "#7EE787",
  attribute: "#79C0FF",
  "diagnostic.error": "#FF7B72",
  "diagnostic.warning": "#E3B341",
})

return (
  <markdown
    content={markdownContent}
    syntaxStyle={syntaxStyle}
    fg="#E6EDF3"
    bg="#0D1117"
    conceal={true}
    internalBlockMode="top-level"
    width="100%"
  />
)
```

## ⚠️ 关键注意事项

### ❌ 不要使用 `addDefaultParsers()`

`addDefaultParsers()` 的作用是**覆盖**内置的默认解析器，而不是添加新的。使用它会导致内置的本地 WASM 解析器被远程 URL 替换，造成功能异常。

### ❌ 不要调用 `await treeSitterClient.initialize()`

解析器是懒加载的，官方 demo 不需要显式初始化。

### ✅ 正确做法

- 内置语言（JS/TS/Markdown）：**无需任何配置**，自动可用
- 额外语言（json/diff 等）：使用 `getTreeSitterClient().addFiletypeParser()`
- 使用 `SyntaxStyle.fromStyles()` 而非 `SyntaxStyle.fromTheme()` 创建样式

## 参考

- 官方 demo: `opentui/packages/core/demo/markdown-demo.ts`
- 内置解析器配置: `opentui/packages/core/src/lib/tree-sitter/parsers-config.ts`
