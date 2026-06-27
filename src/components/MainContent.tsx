/** @jsxImportSource @opentui/solid */
import { createResource, createSignal, Show } from "solid-js";
import { useTheme } from "../context/ThemeContext";
import { PostList } from "./PostList";
import { queryPosts } from "../api/client"; // 1. 确保导入你刚刚写的 ky 请求方法
import { GifPlayer } from "./GifPlayer";

// @ts-ignore
import gifSrc from "../assets/doro.gif" with { type: "image/gif" };
// @ts-ignore
import gifSr2 from "../assets/9f2ffeefda81a1841f40adb3f225958e.gif" with { type: "image/gif" };
import type { ListedPostVo } from "../api/types";
import PostDetail from "./PostDetail";

export function MainContent() {
  const { theme } = useTheme();

  // 2. 创建 Solid 数据资源，默认查询第 1 页，加载 20 条（可根据你的 TUI 容器高度调整）
  const [posts] = createResource(async () => {
    return await queryPosts({ page: 1, size: undefined });
  });

  const [showPost, setShowPost] = createSignal<ListedPostVo | null>(null);

  const handlePostClick = (post: ListedPostVo) => {
    // 在这里处理点击文章的逻辑，比如打开文章详情页
    console.log("点击了文章:", post.spec?.title);
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
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-start",
        flexGrow: 3,
      }}
    >
      <Show when={showPost() != null}>
        <PostDetail
          handleClose={handleClosePost}
          post={showPost() as ListedPostVo}
        />
      </Show>
      <Show when={showPost() == null}>
        <scrollbox
          style={{
            flexGrow: 0,
            flexShrink: 1,
            height: "100%",
            flexDirection: "row",
            backgroundColor: theme.background,
            margin: 0,
            padding: 1,
            scrollY: true,
          }}
          // wrapperOptions={{
          //   flexGrow: 0,
          // }}
          // rootOptions={{
          //   flexGrow: 0,
          // }}
          contentOptions={{
            flexGrow: 0,
            minWidth: "0%", //这行关掉scrollbox内部的自动撑满行为
          }}
          verticalScrollbarOptions={{
            trackOptions: {
              foregroundColor: "transparent",
              backgroundColor: "transparent",
            },
          }}
        >
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
        </scrollbox>
      </Show>
    </box>
  );
}
