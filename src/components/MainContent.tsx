/** @jsxImportSource @opentui/solid */
import { createResource, createEffect, Show } from "solid-js";
import { useTheme } from "../context/ThemeContext";
import { PostList } from "./PostList";
import { queryPosts } from "../api/client";
import { GifPlayer } from "./GifPlayer";
// @ts-ignore
import gifSrc from "../assets/doro.gif" with { type: "image/gif" };
// @ts-ignore
import gifSr2 from "../assets/9f2ffeefda81a1841f40adb3f225958e.gif" with { type: "image/gif" };
import type { ListedPostVo } from "../api/types";
import PostDetail from "./PostDetail";
import { useChat } from "../context/ChatContext";
import { usePostContext } from "../context/PostContext";
import { postToMarkdown } from "../lib/postToMarkdown";

export function MainContent() {
  const { theme } = useTheme();
  const chat = useChat();
  const { showPost, setShowPost } = usePostContext();

  const [posts] = createResource(async () => {
    return await queryPosts({ page: 1, size: undefined });
  });

  // 当 showPost 变化时，更新 AI 上下文
  createEffect(() => {
    const post = showPost();
    if (post) {
      // 进入文章 → 异步获取文章 markdown 内容作为上下文
      postToMarkdown(post).then((md) => {
        const title = post.spec?.title ?? "Untitled";
        chat.setContext(
          `post:${post.metadata.name}`,
          `[Context: 当前正在阅读文章。文章详细信息： "${title}"]\n\n${md}`,
        );
      });
    } else {
      // 回到首页 → 把文章列表作为上下文
      const items = posts()?.items;
      if (items && items.length > 0) {
        const list = items
          .map(
            (p, i) =>
              `${i + 1}. ${p.spec?.title ?? "Untitled"} (${p.metadata.name})`,
          )
          .join("\n");
        chat.setContext(
          "home",
          `[Context: 当前在首页，文章列表如下]\n\n${list}`,
        );
      }
    }
  });

  const handlePostClick = (post: ListedPostVo) => {
    setShowPost(post);
  };

  const handleClosePost = () => {
    setShowPost(null);
  };

  return (
    <box
      style={{
        height: "100%",
        width: "100%",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        flexGrow: 3,
        gap: 0,
        // backgroundColor: "#ffffff",
      }}
    >
      <Show when={showPost() != null}>
        <PostDetail
          handleClose={handleClosePost}
          post={showPost() as ListedPostVo}
        />
      </Show>
      <Show when={showPost() == null}>
        {/* 3. 优先处理错误状态 */}
        <Show
          when={!posts.error}
          fallback={
            <text style={{ fg: theme.error || "#ff5555" }}>
              {" "}
              加载失败: {posts.error()?.message || "未知网络错误"}
            </text>
          }
        >
          {/* 4. 处理正常加载与数据渲染 */}
          <Show
            when={!posts.loading && posts()}
            fallback={
              <text style={{ fg: theme.textMuted }}>
                {" "}
                正在从 Halo 读取文章列表中...
              </text>
            }
          >
            {(data) => (
              <PostList
                posts={data().items ?? []}
                total={data().total ?? 0}
                enterPost={handlePostClick}
              />
            )}
          </Show>
        </Show>
      </Show>
    </box>
  );
}
