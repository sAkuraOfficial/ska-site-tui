import {
  createContext,
  useContext,
  createSignal,
  type ParentProps,
  type Accessor,
} from "solid-js";
import { writeFileSync } from "node:fs";
import {
  streamChat,
  getAIModel,
  type StreamCallbacks,
} from "../api/chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatContextValue {
  markdownContent: Accessor<string>;
  isStreaming: Accessor<boolean>;
  sendMessage: (text: string) => void;
  abort: () => void;
  clearMessages: () => void;
  /** 设置 AI 上下文：key 变化时下一条消息会自动注入 context */
  setContext: (key: string, context: string) => void;
}

const ChatContext = createContext<ChatContextValue>();

export function ChatProvider(props: ParentProps) {
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [markdownContent, setMarkdownContent] = createSignal("");
  const [isStreaming, setIsStreaming] = createSignal(false);
  let abortController: AbortController | null = null;
  let streamingIndex = -1;

  // ── 上下文管理 ──
  let currentContextKey = "";
  let currentContextContent = "";
  let lastSentContextKey = "";

  function setContext(key: string, context: string) {
    currentContextKey = key;
    currentContextContent = context;
  }

  // ── Markdown 格式修正（针对 LLM 输出缺换行的问题） ──
  function normalizeMarkdown(text: string): string {
    if (!text) return text;
    let s = text;

    // 1. 标题缺空格：###标题 → ### 标题
    s = s.replace(/^(#{1,6})([^\s#])/gm, "$1 $2");

    // 2. 水平线粘连标题：---## → ---\n\n##
    s = s.replace(/^(---)(#{1,6})/gm, "$1\n\n$2");

    // 3. 标题粘连后续内容：### 标题文字 → ### 标题\n\n文字（仅当标题后紧跟非空非标题非列表行时）
    s = s.replace(/^(#{1,6}\s+.+?)([^\n])(?=\n|$)/gm, (_match, heading, tail) => {
      // 如果下一行也是标题、列表、表格、代码块、水平线，不加换行
      return heading + tail;
    });

    // 4. 表格分隔行粘连数据行：|---|| `cmd` → |---|\n| `cmd`|
    s = s.replace(/(\|[\s-]+\|)(\|)/g, "$1\n$2");

    // 5. 代码块 ``` 后紧跟内容（非空行）时补换行
    s = s.replace(/```(\w*)\n([^\n`])/g, "```$1\n\n$2");

    // 6. 代码块 ``` 前紧跟文本时补换行
    s = s.replace(/([^\n])```$/gm, "$1\n\n```");

    return s;
  }

  function rebuildMarkdown(msgs: ChatMessage[]): string {
    let md = "";
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i]!;
      if (m.role === "user") {
        md += `> **You:** ${m.content}\n\n`;
      } else {
        md += normalizeMarkdown(m.content) + "\n\n";
      }
    }
    return md;
  }

  function sendMessage(text: string) {
    if (!text.trim() || isStreaming()) return;

    const model = getAIModel();
    if (!model) {
      console.error("[chat] AI_MODEL is not configured");
      setMarkdownContent((prev) => prev + "\n\n> ❌ AI_MODEL 未配置\n\n");
      return;
    }

    // 如果上下文变了，标记需要注入
    let injectContext = "";
    if (currentContextKey && currentContextKey !== lastSentContextKey && currentContextContent) {
      injectContext = currentContextContent;
      lastSentContextKey = currentContextKey;
    }

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const assistantMsg: ChatMessage = { role: "assistant", content: "" };

    // 先算出历史部分的 markdown 基础串
    const baseMarkdown = rebuildMarkdown([...messages(), userMsg]);

    setMessages((prev) => {
      const next = [...prev, userMsg, assistantMsg];
      streamingIndex = next.length - 1;
      return next;
    });
    setIsStreaming(true);
    setMarkdownContent(baseMarkdown);

    // 独立的流式字符串缓冲区 —— 不碰 messages 数组
    let currentAssistantText = "";

    // 构建 API 历史（不含占位的 assistant），注入上下文到第一条用户消息
    const history = messages()
      .filter((_, i) => i !== streamingIndex)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    if (injectContext && history.length > 0 && history[0]!.role === "user") {
      const first = history[0]!;
      history[0] = { role: first.role, content: `${injectContext}\n\n---\n\n${first.content}` };
    }

    abortController = new AbortController();

    const callbacks: StreamCallbacks = {
      onChunk(delta: string) {
        currentAssistantText += delta;
        // 每次全量覆盖，流式期间也做格式修正
        setMarkdownContent(baseMarkdown + normalizeMarkdown(currentAssistantText));
      },
      onDone() {
        // 保存完整 markdown 到文件方便调试
        try {
          const finalMd = baseMarkdown + currentAssistantText;
          writeFileSync("chat-debug.md", finalMd, "utf-8");
          console.log("[chat] Markdown saved to chat-debug.md");
        } catch (e) {
          console.error("[chat] Failed to save markdown:", e);
        }
        // 流式结束，把最终文本同步回 messages 数组
        setMessages((prev) => {
          const next = [...prev];
          const target = next[streamingIndex];
          if (target) {
            next[streamingIndex] = { role: target.role, content: currentAssistantText };
          }
          return next;
        });
        setMarkdownContent(rebuildMarkdown(messages()));
        setIsStreaming(false);
        abortController = null;
        streamingIndex = -1;
      },
      onError(error: Error) {
        console.error("[chat] stream error:", error.message);
        setMessages((prev) => {
          const next = [...prev];
          const target = next[streamingIndex];
          if (target) {
            next[streamingIndex] = {
              role: target.role,
              content: currentAssistantText || `❌ ${error.message}`,
            };
          }
          return next;
        });
        setMarkdownContent(rebuildMarkdown(messages()));
        setIsStreaming(false);
        abortController = null;
        streamingIndex = -1;
      },
    };

    streamChat(history, callbacks, abortController.signal);
  }

  function abort() {
    if (abortController) {
      abortController.abort();
      abortController = null;
      setIsStreaming(false);
      streamingIndex = -1;
    }
  }

  function clearMessages() {
    setMessages([]);
    setMarkdownContent("");
    lastSentContextKey = "";
  }

  return (
    <ChatContext.Provider
      value={{ markdownContent, isStreaming, sendMessage, abort, clearMessages, setContext }}
    >
      {props.children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}
