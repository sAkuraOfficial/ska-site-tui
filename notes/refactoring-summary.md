# 从 Halo AI Foundation 到 Vercel AI SDK 的重构总结

## 问题

最初通过 Halo AI Foundation 插件的 SSE 接口调用 LLM，**无论换哪个模型供应商**，Markdown 渲染都是乱的——表格错位、代码块粘连、标题缺空格、列表项挤在一行。

## 排查过程

### 1. 插件侧排查
- 阅读了 `plugin-ai-foundation` 的完整源码
- 追踪了 delta 从上游 LLM → Spring AI → 插件 → SSE 事件的完整链路
- **结论：插件没有做任何文本转换**，delta 是原样传递的

### 2. 客户端侧排查
- 尝试了各种 `normalizeMarkdown` 正则修复（标题补空格、表格拆行、代码块补行等）
- 对比了 OpenTUI 官方 demo 和 OpenCode 项目的实现
- 发现 OpenCode **不做激进的文本规范化**，只依赖 `MarkdownRenderable` 自身的流式解析能力

### 3. 根因定位
问题出在 **Halo AI Foundation 插件对 SSE 响应的封装方式**：

```
上游 LLM (OpenAI 兼容) 
  → Spring AI ChatResponse 
    → UIMessageStreamMapper 
      → 插件自定义的 SSE 事件格式
```

插件使用了自己的 `UIMessageChunk` 体系（`text-delta`、`reasoning-delta` 等），虽然 delta 值本身没被修改，但**事件的切分粒度和上游 LLM 的 chunk 切分粒度不一致**。Spring AI 在内部做了 chunk 合并/拆分，导致 markdown 语法标记（如 `###`、` ``` `、`|`）被切断到不同的 delta 中，OpenTUI 的增量解析器无法正确识别。

## 解决方案

移除 Halo AI Foundation 插件，改用 **Vercel AI SDK**（`ai` + `@ai-sdk/openai-compatible`）：

```typescript
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";

const provider = createOpenAICompatible({
  name: "custom",
  apiKey: AI_API_KEY,
  baseURL: AI_BASE_URL,
});

const result = streamText({
  model: provider.chatModel(AI_MODEL),
  system: SYSTEM_PROMPT,
  messages,
});

for await (const text of result.textStream) {
  // text 就是纯文本 delta，由 SDK 直接从上游 SSE 的 choices[0].delta.content 提取
  callbacks.onChunk(text);
}
```

## 为什么 Vercel AI SDK 能正常工作

1. **直接对接上游 OpenAI 兼容 API** — 没有中间层转换
2. **`textStream` 直接 yield `choices[0].delta.content`** — 由 SDK 内部从标准 OpenAI SSE 格式提取，不经过 Spring AI 的 chunk 重组
3. **chunk 切分粒度和上游 LLM 一致** — markdown 语法标记不会被人为切断
4. **极简 API** — 287 行 → 61 行，去掉了 Halo Cookie 登录、RSA 加密、CSRF token、手动 SSE 解析

## 关键配置

```bash
# .env
AI_BASE_URL=https://api.openai.com/v1   # 任何 OpenAI 兼容 API
AI_API_KEY=your-api-key
AI_MODEL=gpt-4o-mini
```

## 经验教训

1. **中间层转换可能破坏流式数据的粒度** — 即使 delta 值没被修改，chunk 的切分方式变化也会影响下游解析
2. **OpenTUI 的 MarkdownRenderable 已经内置了流式支持** — 只要输入的 markdown 格式正确，它能很好地处理增量渲染
3. **Vercel AI SDK 是对接 LLM 的最佳选择** — 它直接处理标准 OpenAI SSE 协议，避免了自定义中间层的问题
4. **不要过度做文本规范化** — 复杂的正则修复反而可能破坏 markdown 结构，让渲染器自己处理更可靠
