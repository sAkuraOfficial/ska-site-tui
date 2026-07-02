/** @jsxImportSource @opentui/solid */
import { useTheme } from "../context/ThemeContext";
import { useChat } from "../context/ChatContext";
import {
  SyntaxStyle,
  createMarkdownCodeBlockRenderer,
  parseColor,
} from "@opentui/core";
import { createSignal, createEffect, onMount } from "solid-js";
import { useFocusGroup } from "../context/FocusContext";
import { useRenderer } from "@opentui/solid";
import { createToolStatusRenderer } from "../ui/tool-status";
import { generateSubtleSyntax } from "../theme";

const syntaxStyle = SyntaxStyle.fromStyles({
  keyword: { fg: parseColor("#FF7B72"), bold: true },
  string: { fg: parseColor("#A5D6FF") },
  comment: { fg: parseColor("#8B949E"), italic: true },
  number: { fg: parseColor("#79C0FF") },
  function: { fg: parseColor("#D2A8FF") },
  type: { fg: parseColor("#FFA657") },
  operator: { fg: parseColor("#FF7B72") },
  variable: { fg: parseColor("#E6EDF3") },
  property: { fg: parseColor("#79C0FF") },
  "punctuation.bracket": { fg: parseColor("#F0F6FC") },
  "punctuation.delimiter": { fg: parseColor("#C9D1D9") },
  "markup.heading": { fg: parseColor("#58A6FF"), bold: true },
  "markup.heading.1": { fg: parseColor("#00FF88"), bold: true },
  "markup.heading.2": { fg: parseColor("#00D7FF"), bold: true },
  "markup.heading.3": { fg: parseColor("#FF69B4") },
  "markup.bold": { fg: parseColor("#F0F6FC"), bold: true },
  "markup.strong": { fg: parseColor("#F0F6FC"), bold: true },
  "markup.italic": { fg: parseColor("#F0F6FC"), italic: true },
  "markup.list": { fg: parseColor("#FF7B72") },
  "markup.quote": { fg: parseColor("#3FB950"), italic: true },
  "markup.raw": { fg: parseColor("#A5D6FF"), bg: parseColor("#161B22") },
  "markup.raw.block": {
    fg: parseColor("#A5D6FF"),
    bg: parseColor("#161B22"),
  },
  "markup.raw.inline": {
    fg: parseColor("#A5D6FF"),
    bg: parseColor("#161B22"),
  },
  "markup.link": { fg: parseColor("#58A6FF"), underline: true },
  "markup.link.label": { fg: parseColor("#A5D6FF"), underline: true },
  "markup.link.url": { fg: parseColor("#58A6FF"), underline: true },
  "diff.plus": { fg: parseColor("#3FB950") },
  "diff.minus": { fg: parseColor("#F85149") },
  label: { fg: parseColor("#7EE787") },
  conceal: { fg: parseColor("#6E7681") },
  "punctuation.special": { fg: parseColor("#8B949E") },
  default: { fg: parseColor("#E6EDF3") },
});

export function AIChat() {
  const { theme } = useTheme();
  const { markdownContent, isStreaming, sendMessage } = useChat();
  const { registerItem } = useFocusGroup("sidebar");
  const [inputValue, setInputValue] = createSignal("");
  let scrollRef: any = null;
  let inputRef: any = null;
  const renderer = useRenderer();

  // 将输入框注册到 sidebar 焦点组，Tab 切换时自动聚焦
  onMount(() => {
    if (inputRef) registerItem(inputRef);
  });

  createEffect(() => {
    markdownContent();
    if (scrollRef) {
      requestAnimationFrame(() => {
        scrollRef.scrollToEnd?.();
      });
    }
  });

  function handleSubmit(_value: string) {
    const text = inputValue();
    if (!text.trim()) return;
    sendMessage(text);
    setInputValue("");
  }

  return (
    <box
      style={{
        flexGrow: 1,
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        margin: 0,
        padding: 0,
      }}
    >
      {/* 标题栏 */}
      {/* <box
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          flexShrink: 0,
          alignItems: "center",
          paddingLeft: 1,
          paddingRight: 1,
          height: 1,
        }}
      >
        <text content="💬 AI Chat" fg="#58A6FF" />
      </box> */}

      {/* 消息区域 — 单个 markdown */}
      <scrollbox
        ref={scrollRef}
        style={{
          paddingLeft: 1,
          paddingRight: 1,
        }}
        scrollY={true}
        stickyScroll={true}
        stickyStart="bottom"
        contentOptions={{
          flexGrow: 0,
          minWidth: "0%",
        }}
      >
        <markdown
          content={markdownContent() || "_输入消息开始对话..._"}
          syntaxStyle={syntaxStyle}
          // syntaxStyle={generateSubtleSyntax(theme)}
          streaming={isStreaming()}
          conceal={true}
          tableOptions={{ widthMode: "content" }}
          internalBlockMode="top-level"
          // renderNode={createMarkdownCodeBlockRenderer({
          //   taskflow: createToolStatusRenderer(renderer),
          // })}
        />
      </scrollbox>

      {/* 输入区域 */}
      <box
        style={{
          flexDirection: "column",
          border: ["top"],
          borderColor: "#30363D",
          paddingLeft: 1,
          paddingRight: 1,
          flexShrink: 0,
        }}
      >
        <input
          ref={(el) => (inputRef = el)}
          value={inputValue()}
          onInput={setInputValue}
          onSubmit={handleSubmit as any}
          placeholder={
            isStreaming() ? "AI 正在回复..." : "输入消息 (Enter 发送)"
          }
        />
        <box
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            height: 1,
          }}
        >
          <text
            content={isStreaming() ? "⏹ Esc 停止" : "⏎ Enter 发送"}
            fg="#6E7681"
          />
        </box>
      </box>
    </box>
  );
}
