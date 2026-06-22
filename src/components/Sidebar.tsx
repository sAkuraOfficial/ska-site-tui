/** @jsxImportSource @opentui/solid */
import { useTheme } from "../context/ThemeContext";
import { GifPlayer } from "./GifPlayer";
import { Image } from "./Image";
// @ts-ignore
import gifSrc from "../assets/9f2ffeefda81a1841f40adb3f225958e.gif" with { type: "image/gif" };
/** @jsxImportSource @opentui/solid */
import { Button } from "../ui/button";
import { createSignal, onMount } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { useFocusGroup } from "../context/FocusContext";

export function Sidebar({ width }: { width: number }) {
  const { theme } = useTheme();
  const { registerItem, isActive, focusedIndex } = useFocusGroup("sidebar");

  return (
    <box
      style={{
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: width,
        minWidth: 32,
        height: "auto",
        flexDirection: "column",
        backgroundColor: theme.background,
        // backgroundColor: "#ffffff",//修改底色，这样看起来明显一点。
        alignItems: "stretch",
        justifyContent: "flex-start",
        margin: 0,
        padding: 0,
      }}
    >
      {/* <GifPlayer
        src={gifSrc}
        width={width + 16}
        bgColor={theme.background.toString()}
      /> */}
      <box ref={registerItem}>
        <Button focused={isActive() && focusedIndex() === 0}>提交</Button>
      </box>

      <box ref={registerItem}>
        <Button focused={isActive() && focusedIndex() === 1}>删除</Button>
      </box>

      <box ref={registerItem}>
        <Button focused={isActive() && focusedIndex() === 2}>取消</Button>
      </box>

      {/* 如果某个按钮不可点击(disabled)，不需要写 ref，它就会被键盘导航完美跳过 */}
      <box>
        <Button disabled>不可点击</Button>
      </box>

      {/* 复杂的嵌套布局也完全没问题，依然按顺序自动识别 */}
      <box flexDirection="row" gap={2}>
        <box ref={registerItem}>
          <Button focused={isActive() && focusedIndex() === 3}>返回</Button>
        </box>
        <box ref={registerItem}>
          <Button focused={isActive() && focusedIndex() === 4}>确认</Button>
        </box>
      </box>
    </box>
  );
}
