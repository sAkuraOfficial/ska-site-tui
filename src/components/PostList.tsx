/** @jsxImportSource @opentui/solid */
import { For, createSignal } from "solid-js";
import { TextAttributes, RenderableEvents } from "@opentui/core";
import { useTheme } from "../context/ThemeContext";
import type { ListedPostVo } from "../api/types";
import { useFocusGroup } from "../context/FocusContext";

interface PostListProps {
  posts: ListedPostVo[];
  total: number;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "未知日期";
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr.slice(0, 10);
  }
}

export function PostList(props: PostListProps) {
  const { theme } = useTheme();

  // 👇 解构出 setFocusedIndex
  const { registerItem, isActive, focusedIndex, setFocusedIndex } =
    useFocusGroup("main");

  return (
    <box
      style={{
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        alignSelf: "center",
        padding: 0,
        margin: 0,
        flexGrow: 0,
      }}
    >
      <text style={{ fg: theme.accent, attributes: TextAttributes.BOLD }}>
        {" "}
        文章列表 (共 {props.total} 篇)
      </text>

      <box style={{ flexDirection: "column" }}>
        <For each={props.posts}>
          {(post, index) => {
            const title = post.spec?.title ?? "无标题";
            const author =
              post.owner?.displayName || post.owner?.name || "匿名";
            const publishTime = post.spec?.publishTime;
            const isFirst = () => index() === 0;
            const isLast = () => index() === props.posts.length - 1;

            const [isHover, setIsHover] = createSignal(false);

            const isItemFocused = () =>
              isActive() && focusedIndex() === index();

            return (
              <box
                focusable={true}
                focusedBorderColor={theme.text}
                ref={(el) => {
                  if (!el) return;
                  registerItem(el);
                  el.on(RenderableEvents.FOCUSED, () => {
                    setFocusedIndex(index());
                  });
                }}
                style={{
                  flexDirection: "column",
                  alignItems: "stretch",
                  justifyContent: "flex-start",
                  padding: 0,
                  paddingX: 1,
                  margin: 0,
                  border: isLast()
                    ? ["top", "left", "right", "bottom"]
                    : ["top", "left", "right"],
                  customBorderChars: {
                    topLeft: isFirst() ? "┌" : "├",
                    topRight: isFirst() ? "┐" : "┤",
                    bottomLeft: isLast() ? "└" : "├",
                    bottomRight: isLast() ? "┘" : "┤",
                    horizontal: "─",
                    vertical: "│",
                    leftT: "│",
                    rightT: "│",
                    topT: "─",
                    bottomT: "─",
                    cross: "─",
                  },
                }}
                onMouse={(e) => {
                  switch (e.type) {
                    case "over":
                      setIsHover(true);
                      break;
                    case "out":
                      setIsHover(false);
                      break;
                  }
                }}
              >
                <box
                  style={{
                    backgroundColor: isItemFocused()
                      ? theme.backgroundElement
                      : isHover()
                        ? theme.backgroundElement
                        : theme.background,
                    flexDirection: "row",
                    paddingLeft: 1,
                    paddingRight: 1,
                  }}
                >
                  <box style={{ opacity: isItemFocused() ? 1 : 0 }}>
                    <text>▶</text>
                  </box>

                  <box>
                    <box>
                      <text
                        style={{
                          fg: theme.text,
                          attributes: TextAttributes.BOLD,
                        }}
                      >
                        {" "}
                        {title}
                      </text>
                    </box>
                    <box style={{ flexDirection: "row" }}>
                      <text style={{ fg: theme.textMuted }}> {author} </text>
                      <text style={{ fg: theme.textMuted, flexShrink: 1 }}>
                        {" "}
                        {formatDate(publishTime)}
                      </text>
                    </box>
                  </box>
                </box>
              </box>
            );
          }}
        </For>
      </box>

      {props.posts.length === 0 && (
        <text style={{ fg: theme.textMuted }}>{"  暂无文章"}</text>
      )}
    </box>
  );
}
