/** @jsxImportSource @opentui/solid */
import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/ThemeContext"

export function ShortcutBar() {
  const { theme } = useTheme()

  return (
    <box
      style={{
        height: 2,
        flexShrink: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.backgroundPanel,
        paddingLeft: 1,
        paddingRight: 1,
        gap: 2,
      }}
    >
      <text style={{ fg: theme.primary, attributes: TextAttributes.BOLD }}>Ctrl+T</text>
      <text style={{ fg: theme.textMuted }}> 主题</text>
      <text style={{ fg: theme.border }}>│</text>
      <text style={{ fg: theme.primary, attributes: TextAttributes.BOLD }}>Q</text>
      <text style={{ fg: theme.textMuted }}>/</text>
      <text style={{ fg: theme.primary, attributes: TextAttributes.BOLD }}>Ctrl+C</text>
      <text style={{ fg: theme.textMuted }}>退出</text>
    </box>
  )
}
