/** @jsxImportSource @opentui/solid */
import { useTheme } from "../context/ThemeContext";
import { GifPlayer } from "./GifPlayer";

export function Sidebar({ width }: { width: number }) {
  const { theme } = useTheme();

  return (
    <box
      style={{
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: width,
        minWidth: 20,
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
      <GifPlayer
        width={width}
        height={15}
      />
    </box>
  );
}
