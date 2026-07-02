/** @jsxImportSource @opentui/solid */
import {
  For,
  createSignal,
  createEffect,
  on,
  onMount,
  onCleanup,
} from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../context/ThemeContext";
import { useRenderer } from "@opentui/solid";
import type { ListedPostVo } from "../api/types";
import { useFocusGroup } from "../context/FocusContext";
import { useDialog } from "../ui/dialog";
import { formatDate } from "../lib/date";

interface PostListProps {
  posts: ListedPostVo[];
  total: number;
  enterPost: (post: ListedPostVo) => void;
}

/** 格式化时间为 HH:mm */
function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "";
  }
}

export function PostList(props: PostListProps) {
  const { theme } = useTheme();
  const renderer = useRenderer();
  const dialog = useDialog();
  const { focusedIndex, setFocusedIndex, isActive } = useFocusGroup("main");

  // ── scrollbox ref，用于 scrollChildIntoView 滚动到聚焦卡片 ──
  let scrollboxRef: any = null;

  // ── 存储卡片元素 ref ──
  const cardRefs = new Map<string, any>();

  // ── 当文章列表长度变化时，钳制 focusedIndex 防止越界 ──
  createEffect(
    on(
      () => props.posts.length,
      (count) => {
        if (count > 0 && focusedIndex() >= count) {
          setFocusedIndex(count - 1);
        }
      },
    ),
  );

  // ── Tab 切换到 main 组时，聚焦当前卡片 ──
  createEffect(() => {
    const active = isActive(); // 追踪 activeGroup 信号
    if (active && props.posts.length > 0) {
      focusCard(focusedIndex());
    }
  });

  // ── 对指定索引的卡片聚焦 + 滚动到可视区域 ──
  function focusCard(index: number) {
    const slug = props.posts[index]?.metadata?.name;
    if (!slug) return;
    cardRefs.get(slug)?.focus?.();
    // .focus() 不会自动滚动，需要显式调用 scrollChildIntoView
    scrollboxRef?.scrollChildIntoView?.(slug);
  }

  // ── 键盘导航：上/下/j/k 移动焦点，Enter 进入文章 ──
  const handleKey = (key: { name: string; ctrl?: boolean }) => {
    if (key.ctrl) return;
    // 弹窗打开时，不处理列表键盘事件
    if (dialog.stack.length > 0) return;
    // 非 main 组激活时，不处理列表键盘事件
    if (!isActive()) return;
    const count = props.posts.length;
    if (count === 0) return;

    let newIdx = focusedIndex();

    if (key.name === "down" || key.name === "j") {
      newIdx = (newIdx + 1) % count;
    } else if (key.name === "up" || key.name === "k") {
      newIdx = (newIdx - 1 + count) % count;
    } else if (key.name === "return" || key.name === "enter") {
      const post = props.posts[newIdx];
      if (post) {
        props.enterPost(post);
      }
      return;
    } else {
      return;
    }

    setFocusedIndex(newIdx);
    focusCard(newIdx);
  };

  onMount(() => {
    renderer.keyInput.on("keypress", handleKey);
  });

  onCleanup(() => {
    renderer.keyInput.removeListener("keypress", handleKey);
  });

  return (
    <scrollbox
      ref={(r) => (scrollboxRef = r)}
      style={{
        flexGrow: 0,
        flexShrink: 1,
        height: "100%",
        flexDirection: "row",
        backgroundColor: theme.background,
        margin: 0,
        padding: 1,
        paddingTop: 0,
        scrollY: true,
      }}
      contentOptions={{
        flexGrow: 0,
        minWidth: "0%",
      }}
      verticalScrollbarOptions={{
        trackOptions: {
          foregroundColor: "transparent",
          backgroundColor: "transparent",
        },
      }}
    >
      <box
        style={{
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "flex-start",
          padding: 0,
          gap: 0,
        }}
      >
        {/* ── 列表头 ── */}
        <box
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 1,
            paddingRight: 1,
            paddingBottom: 1,
          }}
        >
          <text
            style={{ fg: theme.accent, attributes: TextAttributes.BOLD }}
          >
            ✦ 文章列表
          </text>
          <text style={{ fg: theme.textMuted }}>
            共 {props.total} 篇
          </text>
        </box>

        {/* ── 文章卡片列表 ── */}
        <box style={{ flexDirection: "column", gap: 1 }}>
          <For each={props.posts}>
            {(post, index) => {
              const title = post.spec?.title ?? "无标题";
              const author =
                post.owner?.displayName || post.owner?.name || "匿名";
              const publishTime = post.spec?.publishTime;
              const slug = post.metadata?.name ?? "";

              const [isHover, setIsHover] = createSignal(false);
              const isFocused = () => focusedIndex() === index();

              // 利用闭包记录上次点击时间，实现双击判定
              let lastClickTime = 0;
              const DOUBLE_CLICK_THRESHOLD = 300;

              return (
                <box
                  id={slug}
                  ref={(el) => {
                    if (el && slug) cardRefs.set(slug, el);
                    else if (!el && slug) cardRefs.delete(slug);
                  }}
                  focusable={true}
                  focusedBorderColor={theme.accent}
                  style={{
                    flexDirection: "column",
                    padding: 1,
                    paddingLeft: 2,
                    paddingRight: 2,
                    gap: 0,
                    border: true,
                    borderStyle: "rounded",
                    borderColor: isFocused()
                      ? theme.accent
                      : isHover()
                        ? theme.borderActive
                        : theme.borderSubtle,
                    backgroundColor: isFocused()
                      ? theme.backgroundElement
                      : isHover()
                        ? theme.backgroundElement
                        : theme.backgroundPanel,
                  }}
                  onMouse={(e) => {
                    switch (e.type) {
                      case "over":
                        setIsHover(true);
                        break;
                      case "out":
                        setIsHover(false);
                        break;
                      case "down":
                        if (e.button === 0) {
                          setFocusedIndex(index());
                          focusCard(index());
                          const now = Date.now();
                          if (now - lastClickTime < DOUBLE_CLICK_THRESHOLD) {
                            props.enterPost(post);
                            lastClickTime = 0;
                          } else {
                            lastClickTime = now;
                          }
                        }
                        break;
                    }
                  }}
                >
                  {/* 第一行：标题 */}
                  <box style={{ flexDirection: "row", alignItems: "center" }}>
                    <text
                      style={{
                        fg: isFocused() ? theme.accent : theme.text,
                        attributes: TextAttributes.BOLD,
                      }}
                    >
                      {title}
                    </text>
                  </box>

                  {/* 第二行：作者 + 发布时间 */}
                  <box style={{ flexDirection: "row", alignItems: "center" }}>
                    <text style={{ fg: theme.primary }}>✎ </text>
                    <text style={{ fg: theme.textMuted }}>{author}</text>
                    {publishTime && (
                      <>
                        <text style={{ fg: theme.borderSubtle }}>  │  </text>
                        <text style={{ fg: theme.textMuted }}>
                          {formatDate(publishTime)}
                        </text>
                        {formatTime(publishTime) && (
                          <text style={{ fg: theme.textMuted }}>
                            {" "}
                            {formatTime(publishTime)}
                          </text>
                        )}
                      </>
                    )}
                  </box>

                  {/* 第三行：slug 标识 */}
                  {slug && (
                    <box style={{ flexDirection: "row", alignItems: "center" }}>
                      <text style={{ fg: theme.secondary }}>@ </text>
                      <text
                        style={{
                          fg: theme.secondary,
                          attributes: TextAttributes.DIM,
                        }}
                      >
                        {slug}
                      </text>
                    </box>
                  )}
                </box>
              );
            }}
          </For>
        </box>

        {/* ── 空状态 ── */}
        {props.posts.length === 0 && (
          <box
            style={{
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
            }}
          >
            <text style={{ fg: theme.textMuted }}>暂无文章</text>
          </box>
        )}
      </box>
    </scrollbox>
  );
}
