import { useTheme } from "../context/ThemeContext"

export function Header({ name }: { name: string }) {
  const { theme } = useTheme()

  return (
    <box
      style={{
        flexGrow: 0,
        flexShrink: 0,
        height: 3,
        backgroundColor: theme.primary,
        alignItems: "center",
        justifyContent: "center",
        // borderStyle: "single",
        // border: true,
      }}
    >
      <text style={{ color: theme.text }}>
        Welcome {name} 🚀
      </text>
    </box>
  );
}
