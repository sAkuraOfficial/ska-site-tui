/** @jsxImportSource @opentui/solid */
import { Show } from "solid-js";
import { useTheme } from "../context/ThemeContext";
import { usePostContext } from "../context/PostContext";
import { AIChat } from "./AIChat";
import { formatDate } from "../lib/date";
import { useSession } from "../context/SessionContext";
import { useFocusGroup } from "../context/FocusContext";
import { getBlogSourceList } from "../api/adapters";
export function Sidebar({ width }: { width: number | `${number}%` }) {
  const { theme } = useTheme();
  const { currentSource, setCurrentSource, showPost, setShowPost } = usePostContext();
  const session = useSession();
  const blogSources = getBlogSourceList();
  const { isActive } = useFocusGroup("sidebar");
  return (
    <box
      style={{
        flexGrow: 1,
        flexShrink: 0,
        width: width,
        flexDirection: "column",
        backgroundColor: theme.background,
        alignItems: "stretch",
        justifyContent: "flex-start",
        margin: 0,
        padding: 0,
      }}
    >
      <box
        style={{
          border: true,
        }}
        title=" STATUS "
        titleColor="#5cb66b"
        flexShrink={0}
        paddingX={1}
      >
        <Show when={showPost() != null}>
          <text>当前文章：{showPost()?.spec?.title || "无名"}</text>
          <text>
            更新时间：
            {formatDate(showPost()?.spec?.publishTime)}
          </text>
        </Show>
        <Show when={showPost() == null}>
          <text>当前位置：首页</text>
          <text>当前用户：{session.username}</text>
        </Show>
      </box>
      <box
        style={{
          border: true,
        }}
        title=" 友链 "
        titleColor="#5cb66b"
        flexShrink={0}
        paddingX={1}
      >
        {blogSources.map((source) => (
          <text
            style={{
              alignSelf: "center",
              fg: currentSource() === source.id ? "#5cb66b" : theme.text,
            }}
            onMouseDown={() => {
              setShowPost(null);
              setTimeout(() => setCurrentSource(source.id), 0);
            }}
          >
            {currentSource() === source.id ? `▸ ${source.name}` : source.name}
          </text>
        ))}
      </box>
      <box
        style={{
          border: true,
          borderColor: isActive() ? "#58A6FF" : theme.text,
        }}
        title=" AI Chat "
        titleColor={isActive() ? "#58A6FF" : "#58A6FF"}
        flexShrink={1}
      >
        <AIChat />
      </box>
    </box>
  );
}
