import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";

// ── 配置 ────────────────────────────────────────────────────────────

const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
const AI_API_KEY = process.env.AI_API_KEY ?? "";
const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";

const provider = createOpenAICompatible({
  name: "custom",
  apiKey: AI_API_KEY,
  baseURL: AI_BASE_URL,
});

// ── System Prompt ────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `你是一个博客助手。请用 Markdown 格式回复，注意以下规范：
- 标题必须在 # 和文字之间加空格，如 "### 正确" 不要 "###错误"
- 列表项的 * 或 - 后面加空格
- 代码块必须用三个反引号包裹
- 段落之间空一行`;

// ── 流式对话 ────────────────────────────────────────────────────────

export interface StreamCallbacks {
  onChunk: (delta: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export async function streamChat(
  messages: { role: "user" | "assistant"; content: string }[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const result = streamText({
      model: provider.chatModel(AI_MODEL),
      system: SYSTEM_PROMPT,
      messages,
      abortSignal: signal,
    });

    for await (const text of result.textStream) {
      callbacks.onChunk(text);
    }

    callbacks.onDone();
  } catch (err: any) {
    if (err.name === "AbortError") return;
    callbacks.onError(err);
  }
}

// ── 辅助 ────────────────────────────────────────────────────────────

export function getAIModel(): string {
  return AI_MODEL;
}
